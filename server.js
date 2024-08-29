const express = require('express');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());
let qrCodeData = '';
let isConnected = false;

const client = new Client();

client.on('qr', (qr) => {
    // Generate QR code and store it
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('Failed to generate QR code:', err);
        } else {
            qrCodeData = url; // Store QR code as data URL
            isConnected = false; // Set connected to false if QR is regenerated
        }
    });
});

client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
    isConnected = true; // Mark as connected when ready
});

client.initialize();

// Serve QR Code to the client
app.get('/qr', (req, res) => {
    if (qrCodeData && !isConnected) {
        res.json({ qrCode: qrCodeData });
    } else if (isConnected) {
        res.json({ connected: true });
    } else {
        res.status(404).json({ error: 'QR code not available yet' });
    }
});

// Endpoint to check if device is connected
app.get('/status', (req, res) => {
    if (isConnected) {
        res.json({ connected: true });
    } else {
        res.json({ connected: false });
    }
});

app.post('/send-message', async (req, res) => {
    const { numbers, message } = req.body;

    if (!numbers || !message) {
        return res.status(400).json({ error: 'Numbers and message are required.' });
    }

    try {
        // Mengumpulkan semua promise untuk pengiriman pesan
        const sendPromises = numbers.map(number => {
            const formattedNumber = `${number}@c.us`;
            return client.sendMessage(formattedNumber, message);
        });

        // Menunggu semua promise selesai
        await Promise.all(sendPromises);

        // Mengirimkan satu respons setelah semua pesan dikirim
        res.json({ status: 'Messages sent successfully' });
    } catch (error) {
        // Menangani kesalahan jika terjadi
        if (!res.headersSent) { // Pastikan headers belum dikirim
            res.status(500).json({ error: 'Failed to send messages', details: error });
        }
    }
});


// Serve static files (frontend)
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
