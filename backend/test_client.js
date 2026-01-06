const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', function open() {
    console.log('Connected to server');
    ws.close();
});

ws.on('close', function close() {
    console.log('Disconnected');
});
