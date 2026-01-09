const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;
const DATA_PATH = path.join(__dirname, 'data/sensor_data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist'), { index: false }));

/* -------------------------
   공통 유틸
-------------------------- */

function readJsonFile() {
    try {
        return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    } catch {
        return [];
    }
}

function appendJsonFile(newData) {
    const data = readJsonFile();
    data.push(newData);
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function broadcast(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

/* -------------------------
   index.html 서빙
-------------------------- */
app.get(/.*/, (req, res) => {
    const indexPath = path.join(__dirname, '../frontend/dist/index.html');

    fs.readFile(indexPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Server Error');

        const injectedScript = `
                <script>
                (function () {
                    console.log(
                        '%c🚀 WebSocket 연결 시도 중...',
                        'color: orange; font-size: 16px; font-weight: bold;'
                    );

                    const ws = new WebSocket('ws://' + window.location.host);

                    ws.onopen = () => {
                     console.log(
                         '%c✅ WebSocket 연결 성공!',
                     'color: #00ff00; font-size: 18px; font-weight: bold;'
                        );  
                 };

                    ws.onmessage = (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            console.log(
                                '%c📩 서버 데이터:',
                                'color: cyan; font-weight: bold;',
                                data
                            );
                        } catch (e) {
                            console.log(
                                '%c📩 서버 메시지:',
                                'color: cyan;',
                                event.data
                            );
                        }
                    };

                    ws.onerror = (err) => {
                        console.error(
                            '%c❌ WebSocket 에러 발생',
                          'color: red; font-size: 16px; font-weight: bold;',
                         err
                        );
                    };

                    ws.onclose = () => {
                        console.log(
                            '%c❌ WebSocket 연결 종료',
                            'color: red; font-size: 16px; font-weight: bold;'
                        );
                    };
                })();
                </script>
                `;


        res.send(html.replace('</body>', injectedScript + '</body>'));
    });
});

/* -------------------------
   WebSocket 처리 (핵심 수정)
-------------------------- */
wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`🔌 Client connected from ${ip}`);

    // 접속자 수 확인
    console.log(`👥 현재 연결 수: ${wss.clients.size}`);

    // 접속 시 기존 데이터 전송
    ws.send(JSON.stringify({
        type: 'init',
        payload: readJsonFile()
    }));

    ws.on('message', (message) => {
        const raw = message.toString();
        console.log(`📥 FROM ${ip}:`, raw);

        try {
            const data = JSON.parse(raw);

            const packet = {
                ...data,
                receivedAt: new Date().toISOString(),
                from: ip
            };

            // 파일 저장
            appendJsonFile(packet);

            // 모든 클라이언트로 브로드캐스트
            broadcast({
                type: 'sensor',
                payload: packet
            });

            // 🔁 ACK (라즈베리파이 확인용)
            ws.send(JSON.stringify({
                type: 'ack',
                msg: '서버에서 데이터 수신 완료',
                at: new Date().toISOString()
            }));

        } catch (err) {
            console.error('❌ JSON 파싱 실패:', err);
        }
    });

    ws.on('close', () => {
        console.log(`❌ Client disconnected from ${ip}`);
        console.log(`👥 현재 연결 수: ${wss.clients.size}`);
    });
});

/* -------------------------
   서버 시작
-------------------------- */
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server started on port ${PORT}`);
});
