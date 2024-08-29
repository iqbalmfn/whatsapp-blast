const express = require('express');
const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');

const app = express();
app.use(express.json());

const client = new Client();

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('QR Code generated, please scan.');
});

client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
});

client.initialize();

// Endpoint untuk mengirim WhatsApp Blast
app.post('/send-blast', (req, res) => {
    const { numbers, message } = req.body;
    if (!numbers || !message) {
        return res.status(400).json({ error: 'Numbers and message are required.' });
    }

    numbers.forEach(number => {
        const whatsappNumber = `${number}@c.us`; // Format nomor WhatsApp
        client.sendMessage(whatsappNumber, message)
            .then(response => {
                console.log(`Message sent to ${number}`);
            })
            .catch(err => {
                console.error(`Failed to send message to ${number}:`, err);
            });
    });

    res.json({ status: true, message : "Messages sent" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
