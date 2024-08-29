const express = require('express');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());

let qrCodeData = '';
let isConnected = false;

const client = new Client();
client.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('Failed to generate QR code:', err);
        } else {
            qrCodeData = url;
            isConnected = false;
        }
    });
});

client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
    isConnected = true;
});

client.initialize();

app.get('/qr', (req, res) => {
    if (qrCodeData && !isConnected) {
        res.json({ qrCode: qrCodeData });
    } else if (isConnected) {
        res.json({ connected: true });
    } else {
        res.status(404).json({ error: 'QR code not available yet' });
    }
});

app.get('/status', (req, res) => {
    res.json({ connected: isConnected });
});

app.post('/send-message', async (req, res) => {
    const { numbers, message } = req.body;

    if (!numbers || !message) {
        return res.status(400).json({ error: 'Numbers and message are required.' });
    }

    try {
        const sendPromises = numbers.map(number => {
            const formattedNumber = `${number}@c.us`;
            return client.sendMessage(formattedNumber, message);
        });

        await Promise.all(sendPromises);

        res.json({ status: 'Messages sent successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send messages', details: error });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
