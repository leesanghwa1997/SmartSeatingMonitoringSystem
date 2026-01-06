const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;

const path = require('path');
const fs = require('fs');

app.use(express.json());

// 정적 파일 서빙 (JS, CSS 등) - index.html 제외
app.use(express.static(path.join(__dirname, '../frontend/dist'), {
    index: false
}));

// 메인 라우트 - index.html에 WebSocket 스크립트 주입하여 전송
app.get(/.*/, (req, res) => {
    const indexPath = path.join(__dirname, '../frontend/dist/index.html');

    fs.readFile(indexPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading index.html:', err);
            return res.status(500).send('Server Error');
        }

        // 주입할 스크립트
        const injectedScript = `
        <script>
            (function() {
                console.log('%c🚀 서버 연결 준비 완료!', 'color: #00ff00; font-size: 20px; font-weight: bold;');
                
                const ws = new WebSocket('ws://' + window.location.host);
                
                ws.onopen = () => {
                    console.log('%c✅ WebSocket 연결 성공!', 'color: #00ff00; font-size: 16px; font-weight: bold;');
                };
                
                ws.onmessage = (event) => {
                    console.log('📩 서버 메시지:', event.data);
                };
                
                ws.onclose = () => {
                    console.log('%c❌ WebSocket 연결 종료', 'color: red; font-size: 16px; font-weight: bold;');
                };
            })();
        </script>
        `;

        // </body> 태그 직전에 스크립트 삽입
        const result = data.replace('</body>', `${injectedScript}</body>`);
        res.send(result);
    });
});

// WebSocket 연결 처리
wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
        console.log(`Received: ${message}`);
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    // 테스트용 주기적 데이터 전송 (5초마다)
    const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            const data = JSON.stringify({
                type: 'heartbeat',
                timestamp: new Date().toISOString()
            });
            ws.send(data);
        }
    }, 5000);

    ws.on('close', () => clearInterval(interval));
});

server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
