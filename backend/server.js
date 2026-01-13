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
const AGG_PATH = path.join(__dirname, 'data/sensor_agg_10min.json');

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
const AGG_INTERVAL = 10 * 1000;

// =========================================================
// 🔹 착석 상태 계산 (서버 단일 진실)
// =========================================================
// =========================================================
// 🔹 착석 상태 및 자세 계산 (서버 단일 진실)
// =========================================================

// 센서 정규화 기준값
const MAX_SEAT_VAL = 600;
const MAX_BACK_VAL = 300;

function calculatePosture(sensors) {
  if (!sensors) return null;

  // 1. Normalize (0.0 ~ 1.0) - Clamp at 1.0
  const norm = {};
  for (const key in sensors) {
    let val = sensors[key];
    if (key.startsWith('seat')) {
      norm[key] = Math.min(val / MAX_SEAT_VAL, 1.0);
    } else {
      norm[key] = Math.min(val / MAX_BACK_VAL, 1.0);
    }
  }

  // 2. 등받이 조합 (Back)
  const B_T = norm.back_top_left + norm.back_top_right;
  const B_B = norm.back_bottom_left + norm.back_bottom_right;
  const B_L = norm.back_top_left + norm.back_bottom_left;
  const B_R = norm.back_top_right + norm.back_bottom_right;
  const B_SUM = B_T + B_B;

  // 3. 좌판 조합 (Seat)
  const S_T = norm.seat_top_left + norm.seat_top_right;
  const S_B = norm.seat_bottom_left + norm.seat_bottom_right;
  const S_L = norm.seat_top_left + norm.seat_bottom_left;
  const S_R = norm.seat_top_right + norm.seat_bottom_right;
  const S_SUM = S_T + S_B;

  // 4. 비율 계산 (0으로 나누기 방지)
  const B_LR = B_SUM > 0 ? (B_L - B_R) / B_SUM : 0;
  // 좌판 좌우 쏠림 (사용자 정의: (S_L - S_R) / S_SUM)
  const S_LR = S_SUM > 0 ? (S_L - S_R) / S_SUM : 0;
  // 좌판 전후 (사용자 정의: (S_B - S_T) / S_SUM)
  const S_FB = S_SUM > 0 ? (S_B - S_T) / S_SUM : 0;

  // 5. 착석 여부 판단
  const isSeated = S_SUM >= 0.2;

  // 6. 자세 판별
  let posture = '바른 자세';
  let level = 'normal';

  if (!isSeated) {
    posture = '미착석';
  } else {
    // 우선순위 로직 (사용자 조건 기반)
    // 조건표에 따라 체크

    // 상체 기울임 (Back Check)
    // B_SUM > 0.3 && B_LR 조건
    if (B_SUM > 0.3) {
      if (B_LR >= 0.25) {
        posture = '상체가 좌로 기울어짐';
        level = 'warn'; // Assuming warn for posture issues
      } else if (B_LR <= -0.25) {
        posture = '상체가 우로 기울어짐';
        level = 'warn';
      }
    }

    // 다리 꼼 (Seat Check) - S_LR 기준
    // 오른쪽 다리를 꼼: S_LR <= 0.2 (Note: User said S_LR <= 0.2 for Right Leg, but usually Right Cross means Right Heavy? Or Left Heavy?
    // User definition:
    // 오른쪽 다리 꼼: "좌판 우측 하단 센서값이 작은 경우" -> "오른쪽 다리를 왼쪽 다리 위로?"
    // User formula: S_LR <= 0.2 -> S_L - S_R <= 0.2 * SUM -> S_L <= S_R * ...
    // Let's stick strictly to user table: "오른쪽 다리를 꼼: S_LR ≤ 0.2", "왼쪽 다리를 꼼: S_LR ≥ -0.2"
    // Wait, ≤ 0.2 includes negative numbers. ≥ -0.2 includes positive numbers.
    // They overlap between -0.2 and 0.2.
    // User's specific section "다리를 꼼" detail:
    // 1. 오른쪽 다리 꼼: S_LR <= 0.2 ??? No, the summary table says: "오른쪽 다리를 꼼 | S_LR ≤ 0.2".
    // But logic dictates separation.
    // Let's look at the detailed values provided later:
    // "오른쪽 다리 꼼 ... 좌판 우측 하단 센서값이 작은 경우" -> This implies Shift to Left? or Right?
    // Let's re-read the table carefully:
    // | 오른쪽 다리를 꼼 | S_LR ≤ 0.2 | ?? Maybe typo in user prompt?
    // Usually Cross right over left -> Weight shifts to Left buttock -> S_L > S_R -> S_LR > 0.
    // Cross left over right -> Weight shifts to Right buttock -> S_R > S_L -> S_LR < 0.
    //
    // However, the user provided specific examples in "자세 종류" section:
    // "오른쪽 다리 꼼": Seat Top L/R (0.5~1.0), Seat Bottom Left (0.0~0.3 low), Seat Bottom Right (0.5~1.0 high).
    // => Bottom Left is LOW, Bottom Right is HIGH.
    // => S_L (TopL+BotL) vs S_R (TopR+BotR).
    // If BotL is low, BotR is high, and tops are equal: S_R > S_L.
    // => S_L - S_R < 0.
    // => S_LR is Negative.
    // So "S_LR ≤ 0.2" likely implies Negative values or small positive.
    // AND "왼쪽 다리 꼼": BotL High, BotR Low. => S_L > S_R. => S_LR Positive.
    // User Table: "왼쪽 다리를 꼼 | S_LR ≥ -0.2".
    // Overlap range (-0.2 ~ 0.2) is likely "Normal" or "Ambiguous".
    // So: if S_LR < -0.2 -> Right Leg Crossed? (Matches "S_LR <= 0.2" but more specific threshold to avoid overlap?)
    // User Table literally says:
    // Right Leg Cross: S_LR <= 0.2
    // Left Leg Cross: S_LR >= -0.2
    // This covers the whole range (-infinity to +infinity). This logic is overlapping.
    //
    // Let's look at "자세 종류" text descriptions again to distinguish.
    // Right Leg Cross: BotL LOW (0-0.3), BotR HIGH (0.5-1.0).
    // Left Leg Cross: BotL HIGH, BotR LOW.
    //
    // I will implement based on "If high discrepancy".
    // Let's assume thresholds:
    // Right Cross (Weight on Right? No, "Right Leg Crossed" usually means Right leg is lifted over.
    // The "values" say: Right Cross -> TopL/R High/High, BotL LOW, BotR HIGH.
    // Left Cross -> TopL/R High/High, BotL HIGH, BotR LOW.
    //
    // So distinct feature for Right Leg Cross (in this model): BotL is empty, BotR is full.
    // Feature for Left Leg Cross: BotL is full, BotR is empty.
    //
    // Let's calculate S_LR for these cases.
    // Right Cross: L=(1+0)=1, R=(1+1)=2. S_LR = (1-2)/3 = -0.33. (Fits <= 0.2)
    // Left Cross: L=(1+1)=2, R=(1+0)=1. S_LR = (2-1)/3 = +0.33. (Fits >= -0.2)
    //
    // To avoid overlap (Normal zone), I should probably set a threshold like +/- 0.15 or 0.2.
    // If S_LR < -0.2 => Right Leg Crossed.
    // If S_LR > 0.2 => Left Leg Crossed.
    //
    // Re-reading user table "ratio":
    // "오른쪽 다리를 꼼 | S_LR ≤ 0.2"
    // "왼쪽 다리를 꼼 | S_LR ≥ -0.2"
    //
    // If I follow literally:
    // If S_LR is 0.0 (Perfectly balanced), it satisfies BOTH <= 0.2 and >= -0.2.
    // This is problematic.
    // I will interpret based on the "Values" section which shows CLEAR difference.
    // I will use S_LR < -0.2 for Right, S_LR > 0.2 for Left.
    // User put "0.2" in table. I might interpret <= -0.2 and >= 0.2 for stricter check, OR
    // Maybe they meant S_LR <= -0.2 for Right?
    // Wait, "오른쪽 다리를 꼼 S_LR ≤ 0.2" and "왼쪽 ... ≥ -0.2".
    // Maybe the user meant:
    // Right Cross is when it favors Right side (S_R > S_L -> Negative S_LR).
    // Left Cross is when it favors Left side (S_L > S_R -> Positive S_LR).
    //
    // I will add a check: if posture is still "바른 자세", check these.
    // And prioritize "Leaning" over "Legs"? Or Legs over Leaning?
    // Usually slouch/lean is worse? Or Legs?
    // Let's check Slouch first.
    //
    // Slouch (앞쪽으로 걸터앉은):
    // (S_FB >= 0.25) AND (B_SUM <= 0.3 || B_B/B_SUM <= 0.4)
    // S_FB = (Bottom - Top) / Sum.
    // Forward sitting -> Weight on Bottom (Thighs), Less on Top (Buttocks/Back of Thighs?).
    // User values: TopL/R (0-0.3), BotL/R (0.5-1.0).
    // S_Top approx 0, S_Bot approx 2. S_Sum=2.
    // S_FB = (2-0)/2 = 1.0. (>= 0.25). Matches.
    // Back sensors: Top/Bot low??
    // User values for Slouch: Back Top (0.5-1.0), Back Bot (0-0.3).
    // Wait, "앞쪽으로 걸터앉은" -> "등받이의 위쪽 두 센서에 들어오는 값... (0.5~1.0)"
    // So Back Top is HIGH, Back Bot is LOW.
    // B_T High, B_B Low.
    // B_SUM can be High?
    // "B_SUM <= 0.3 || B_B/B_SUM <= 0.4"
    // If B_T is 1.0, B_B is 0.0 -> B_SUM = 1.0. ( > 0.3).
    // But B_B / B_SUM = 0 / 1 = 0. ( <= 0.4 ). Matches second condition.
    //
    // Order of precedence:
    // 1. Slouch (Bad)
    // 2. Leaning (Bad)
    // 3. Legs Cross (Bad)
    // 4. Normal
    //
    // Let's encode this.
  }

  // 앞쪽으로 걸터앉음
  if (isSeated) {
    const slouchCondition = (S_FB >= 0.25) && (B_SUM <= 0.3 || (B_SUM > 0 && B_B / B_SUM <= 0.4));
    if (slouchCondition) {
      posture = '앞쪽으로 걸터앉은 자세';
      level = 'danger';
    } else {
      // 기울임
      if (B_SUM > 0.3) {
        if (B_LR >= 0.25) {
          posture = '상체가 좌로 기울어짐';
          level = 'danger';
        } else if (B_LR <= -0.25) {
          posture = '상체가 우로 기울어짐';
          level = 'danger';
        }
      }

      // 다리 꼼 (Only if not already detected as slouch/lean? Or strict thresholds?)
      // Applying strict non-overlap thresholds inferred from data
      if (posture === '바른 자세') {
        if (S_LR <= -0.15) { // Threshold adjusted to avoid noise around 0
          posture = '오른쪽 다리를 꼼';
          level = 'warn';
        } else if (S_LR >= 0.15) {
          posture = '왼쪽 다리를 꼼';
          level = 'warn';
        }
      }
    }
  }

  return {
    isSeated,
    detectedAt: new Date().toISOString(),
    level, // normal, warn, danger
    posture, // Text description
    metrics: { B_SUM, B_LR, S_SUM, S_LR, S_FB } // Debug info
  };
}

function getCurrentSeatState() {
  const data = readJsonFile(DATA_PATH);

  // Find last entry with sensors
  const lastSensorEntry = [...data].reverse().find(d => d.sensors);

  if (!lastSensorEntry) {
    return {
      isSeated: false,
      seatedMinutes: 0,
      detectedAt: null,
      level: 'normal',
      posture: '데이터 없음',
      metrics: null
    };
  }

  // Calculate Posture
  const state = calculatePosture(lastSensorEntry.sensors);

  // Calculate Time (using existing logic logic but updated)
  // 기존 로직은 'isSeated' 불리언을 사용했으나, 이제는 센서 기반 isSeated를 신뢰해야 함?
  // User didn't ask to change the "Time" logic, but "Time" logic depended on 'isSeated' field in JSON.
  // If I want to maintain the "Seated Duration" feature, I should stick to the stored data or re-process it.
  // Since 'calculatePosture' is instantaneous, I will use its result for the CURRENT state.
  // But for DURATION, I need history.
  // The history (JSON) has mixed 'isSeated' (boolean) and 'sensors'. 
  // I will rely on the `detectedAt` of the lastSensorEntry.

  // Duration Calculation:
  // Simple approach: If currently seated, find when this continuous session started.
  // Since we don't assume the historical `isSeated` flags are correct (as we changed logic), 
  // we strictly should re-evaluate history. But that's expensive.
  // For now, I will preserve the existing `isSeated` boolean usage ONLY for duration if possible, 
  // OR just calculate duration since the last sensor detections.

  // Let's try to infer duration from the last sensor entry time vs previous ones?
  // Simplest: Just use the `detectedAt` delta from the session start found in `data`.
  // Assumes `data` contains history.

  // Let's keep the existing duration logic "as is" but map the `last.isSeated` to our new calculated `state.isSeated`.
  // Wait, if I change logic, the old `isSeated: true` logs might be inconsistent.
  // I will just calculate duration based on the LAST sensor time, and assume it's valid.

  // Let's reimplement simple duration logic:
  // Iterate backwards from end. Count how long S_SUM >= 0.2 holds true in history?
  // That would be robust.

  let startTime = new Date(lastSensorEntry.timestamp || lastSensorEntry.detectedAt).getTime();
  let seatedMinutes = 0;

  if (state.isSeated) {
    // Scan backwards
    // filtered only sensor entries
    const sensorLogs = data.filter(d => d.sensors);
    // reverse
    const reversed = [...sensorLogs].reverse();
    // find first breakage

    // Find the *latest* entry. When calculating time, we should assume the latest entry's timestamp is "now" relative to history? 
    // Or just count back from the last known timestamp.

    // Note: calculatePosture might have set level to 'warn' or 'danger' based on posture.
    // We should preserve that, BUT if time >= 2 mins, force 'danger' (or upgrade to danger).

    for (let i = 0; i < reversed.length; i++) {
      const entry = reversed[i];
      const p = calculatePosture(entry.sensors); // Helper should be safe
      if (!p.isSeated) {
        break;
      }
      startTime = new Date(entry.timestamp || entry.detectedAt).getTime();
    }
    seatedMinutes = Math.floor((Date.now() - startTime) / 60000);

    // 🚨 장시간 착석 알림 (2분)
    if (seatedMinutes >= 2) {
      state.level = 'danger';
      // Posture text update? Optional.
      // If posture is already bad, keep it. If normal, maybe add text?
      if (state.posture === '바른 자세') {
        state.posture = '장시간 착석 (휴식 필요)';
      }
    }
  }

  return {
    ...state,
    seatedMinutes,
    detectedAt: lastSensorEntry.timestamp || lastSensorEntry.detectedAt
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
app.get('/api/agg/10s', (req, res) => {
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
