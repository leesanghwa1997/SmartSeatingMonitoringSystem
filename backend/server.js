const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;

// =====================
// 파일 경로
// =====================
const DATA_PATH = path.join(__dirname, 'data/sensor_data.json');
const AGG_PATH  = path.join(__dirname, 'data/sensor_agg_10min.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist'), { index: false }));

// =====================
// 공통 유틸
// =====================
function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

function appendJsonFile(filePath, newData) {
  const data = readJsonFile(filePath);
  data.push(newData);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// =====================
// ⏱ 10분 집계 상태
// =====================
let aggBuffer = [];
let lastAggTime = Date.now();
const AGG_INTERVAL = 10 * 60 * 1000;

// =========================================================
// 🔹 착석 상태 계산 (서버 단일 진실)
// =========================================================
function getCurrentSeatState() {
  const data = readJsonFile(DATA_PATH);
  const seatLogs = data.filter(d => typeof d.isSeated === 'boolean');

  if (seatLogs.length === 0) {
    return {
      isSeated: false,
      seatedMinutes: 0,
      detectedAt: null,
      level: 'normal'
    };
  }

  const last = seatLogs[seatLogs.length - 1];
  let seatedMinutes = 0;

  if (last.isSeated) {
    const reversed = [...seatLogs].reverse();
    const stop = reversed.find(d => d.isSeated === false);

    const startTime = stop
      ? new Date(stop.detectedAt).getTime()
      : new Date(seatLogs[0].detectedAt).getTime();

    seatedMinutes = Math.floor((Date.now() - startTime) / 60000);
  }

  let level = 'normal';
  if (seatedMinutes >= 2) level = 'danger';
  else if (seatedMinutes >= 1) level = 'warn';

  return {
    isSeated: last.isSeated,
    seatedMinutes,
    detectedAt: last.detectedAt,
    level
  };
}

// =========================================================
// ✅ API
// =========================================================

// 1️⃣ 대시보드 상태
app.get('/api/state/current', (req, res) => {
  res.json(getCurrentSeatState());
});

// 2️⃣ 10분 평균 히스토리
app.get('/api/agg/10min', (req, res) => {
  const data = readJsonFile(AGG_PATH);
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const result = data
    .filter(d => now - new Date(d.time).getTime() <= DAY)
    .map(d => ({
      time: new Date(d.time).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      avg: d.avg
    }));

  res.json(result);
});

// 🔥 3️⃣ 최신 센서 분포 (A안 핵심)
app.get('/api/sensors/latest', (req, res) => {
  const data = readJsonFile(DATA_PATH);

  const lastSensor = [...data]
    .reverse()
    .find(d => d.sensors);

  res.json(lastSensor ? lastSensor.sensors : null);
});

// 🔥 4️⃣ 착석 기록 초기화
app.post('/api/state/reset', (req, res) => {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify([], null, 2));
    fs.writeFileSync(AGG_PATH, JSON.stringify([], null, 2));
    aggBuffer = [];
    lastAggTime = Date.now();

    console.log('🧹 착석 기록 전체 초기화 완료');
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ 초기화 실패', err);
    res.status(500).json({ ok: false });
  }
});

// =========================================================
// WebSocket (라즈베리 ↔ 서버 전용)
// =========================================================
wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`🔌 Client connected from ${ip}`);

  ws.on('message', message => {
    try {
      const data = JSON.parse(message.toString());

      const packet = {
        ...data,
        receivedAt: new Date().toISOString(),
        from: ip
      };

      // raw 저장
      appendJsonFile(DATA_PATH, packet);

      // 상태 이벤트 처리
      if (typeof data.isSeated === 'boolean') {
        broadcast({
          type: 'state',
          payload: getCurrentSeatState()
        });
      }

      // 10분 집계
      if (data.sensors) {
        aggBuffer.push({
          sensors: data.sensors,
          receivedAt: packet.receivedAt
        });
      }

      ws.send(JSON.stringify({ type: 'ack' }));
    } catch (err) {
      console.error('❌ JSON 파싱 실패', err);
    }
  });
});

// =========================================================
// ❤️ Heartbeat (연결 유지용)
// =========================================================
setInterval(() => {
  broadcast({ type: 'heartbeat', at: new Date().toISOString() });
}, 2000);

// =========================================================
// ⏱ 10분 집계 실행
// =========================================================
setInterval(() => {
  if (aggBuffer.length === 0) return;

  let sum = 0;
  let count = 0;

  aggBuffer.forEach(item => {
    Object.values(item.sensors).forEach(v => {
      sum += v;
      count++;
    });
  });

  const avg = Number((sum / count).toFixed(2));

  appendJsonFile(AGG_PATH, {
    time: new Date(lastAggTime).toISOString(),
    avg,
    samples: aggBuffer.length
  });

  aggBuffer = [];
  lastAggTime = Date.now();
}, AGG_INTERVAL);

// =========================================================
// SPA catch-all
// =========================================================
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// =========================================================
// 서버 시작
// =========================================================
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server started on port ${PORT}`);
});
