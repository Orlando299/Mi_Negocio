// bridge-server.js
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);

// ============================================================
// CONFIGURACIÓN
// ============================================================
const PORT = 3001;
const WS_PORT = 3002;

// ============================================================
// SERVIDOR HTTP (para recibir comandos de Open WebUI)
// ============================================================
app.use(cors());
app.use(express.json());

// Almacenar la última respuesta del agente
let lastResponse = null;
let pendingCommand = null;
let commandResolve = null;

// Endpoint que Open WebUI llamará
app.post('/execute', async (req, res) => {
    const { command } = req.body;
    console.log(`📩 Comando recibido de OpenWebUI: "${command}"`);

    if (!command) {
        return res.status(400).json({ error: 'Comando requerido' });
    }

    // Guardar el comando pendiente
    pendingCommand = command;
    lastResponse = null;

    // Enviar el comando a todos los clientes WebSocket conectados
    broadcastCommand(command);

    // Esperar respuesta del navegador (con timeout)
    try {
        const response = await waitForResponse(30000); // 30 segundos
        res.json({ result: response });
    } catch (error) {
        res.status(504).json({ 
            error: 'Tiempo de espera agotado',
            message: 'El navegador no respondió a tiempo'
        });
    }
});

// Función para esperar la respuesta del navegador
function waitForResponse(timeout) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            commandResolve = null;
            reject(new Error('Timeout'));
        }, timeout);

        commandResolve = (response) => {
            clearTimeout(timer);
            resolve(response);
        };
    });
}

// ============================================================
// SERVIDOR WEBSOCKET (para comunicarse con el navegador)
// ============================================================
const wss = new WebSocket.Server({ port: WS_PORT });

// Almacenar todos los clientes conectados
const clients = new Set();

wss.on('connection', (ws) => {
    console.log('🟢 Navegador conectado al WebSocket');
    clients.add(ws);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 Mensaje del navegador:', data);

            // Si es una respuesta a un comando
            if (data.type === 'response') {
                lastResponse = data.result;
                if (commandResolve) {
                    commandResolve(data.result);
                    commandResolve = null;
                }
            }
        } catch (e) {
            console.error('Error al parsear mensaje:', e);
        }
    });

    ws.on('close', () => {
        console.log('🔴 Navegador desconectado');
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('Error en WebSocket:', error);
    });
});

// Función para broadcast de comandos
function broadcastCommand(command) {
    const message = JSON.stringify({ type: 'command', command });
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
    console.log(`📤 Comando enviado a ${clients.size} clientes WebSocket`);
}

// ============================================================
// RUTAS EXTRA
// ============================================================
app.get('/status', (req, res) => {
    res.json({
        status: 'online',
        clientsConnected: clients.size,
        pendingCommand: pendingCommand,
        lastResponse: lastResponse
    });
});

app.get('/ping', (req, res) => {
    res.json({ pong: true, time: new Date().toISOString() });
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================
server.listen(PORT, () => {
    console.log(`🚀 Servidor HTTP escuchando en http://localhost:${PORT}`);
    console.log(`🔌 Servidor WebSocket escuchando en ws://localhost:${WS_PORT}`);
    console.log(`📊 Estado: http://localhost:${PORT}/status`);
    console.log('\n✅ ¡Puente listo! Esperando conexiones...');
});
