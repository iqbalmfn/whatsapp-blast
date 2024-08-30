const express = require('express');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');


const app = express();
app.use(cors());
app.use(express.json());
let qrCodeData = '';
let isConnected = false;
let connectionState = 'DISCONNECTED';
let connectedNumber = ''; // Variable to store connected WhatsApp number

const client = new Client();

client.on('qr', (qr) => {
    // Generate QR code and store it
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('Failed to generate QR code:', err);
        } else {
            qrCodeData = url; // Store QR code as data URL
            isConnected = false; // Set connected to false if QR is regenerated
            connectionState = 'DISCONNECTED';
            connectedNumber = ''; // Reset connected number
        }
    });
});

client.on('ready', async () => {
    console.log('WhatsApp Client is ready!');
    isConnected = true; // Mark as connected when ready
    connectionState = 'CONNECTED';

    // Get the connected WhatsApp number
    const info = await client.getState();
    if (info) {
        connectedNumber = await client.info.wid._serialized; // Get connected number
        console.log('Connected Number:', connectedNumber);
    }
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp Client was disconnected:', reason);
    isConnected = false;
    connectionState = 'DISCONNECTED';
    connectedNumber = ''; // Reset connected number on disconnect
});

client.on('auth_failure', (msg) => {
    console.error('Authentication failure:', msg);
    isConnected = false;
    connectionState = 'AUTH_FAILED';
    connectedNumber = ''; // Reset connected number on auth failure
});

client.on('state_changed', (state) => {
    console.log('State changed:', state);
    connectionState = state;
    isConnected = state === 'CONNECTED';
});

client.initialize();

// Serve QR Code to the client
app.get('/qr', (req, res) => {
    if (qrCodeData && !isConnected) {
        res.json({ qrCode: qrCodeData });
    } else if (isConnected) {
        res.json({ connected: true, connectedNumber });
    } else {
        res.status(404).json({ error: 'QR code not available yet' });
    }
});

// Endpoint to check if device is connected
app.get('/status', (req, res) => {
    res.json({ connected: isConnected, state: connectionState, connectedNumber });
});

app.post('/send-message', async (req, res) => {
    const { numbers, message } = req.body;

    if (!numbers || !message) {
        return res.status(400).json({ error: 'Numbers and message are required.' });
    }

    if (!isConnected) {
        return res.status(503).json({ error: 'WhatsApp Client is not connected.' });
    }

    try {
        const sendPromises = numbers.map(number => {
            const formattedNumber = `${number}@c.us`;
            return client.sendMessage(formattedNumber, message);
        });

        await Promise.all(sendPromises);
        res.json({ status: 'Messages sent successfully' });
    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to send messages', details: error });
        }
    }
});

// Serve static files (frontend)
app.use(express.static('public'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
