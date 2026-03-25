/**
 * Visual Pi Card — Backend Server
 * pivisualcard.online (198.54.116.227)
 * Pi Network Visual Payment Card API
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// --------------- Middleware ---------------
app.use(cors({
    origin: ['https://pivisualcard.online', 'http://pivisualcard.online', 'http://198.54.116.227', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname)));   // serve the HTML directly

// --------------- In-Memory Store ---------------
// In production, replace with a real database
const users = {
    pioneer: {
        id: 'usr_pioneer',
        username: 'pioneer',
        name: 'PI PIONEER',
        balance: 1247.83,
        piAddress: 'GCDXL7HQ4GKMV5YA3BQPZ4PIPIONEER',
        cardType: 'visa',
        transactions: [
            { id: 'tx_001', type: 'recv',  name: 'Mining Reward',             amount: 3.14,  date: '2026-03-25T10:00:00Z', status: 'completed' },
            { id: 'tx_002', type: 'sent',  name: 'Sent to @pioneer42',        amount: -15.00, date: '2026-03-24T14:30:00Z', status: 'completed' },
            { id: 'tx_003', type: 'shop',  name: 'Pi Marketplace',            amount: -8.50,  date: '2026-03-23T09:15:00Z', status: 'completed' },
            { id: 'tx_004', type: 'recv',  name: 'Received from @pidev',      amount: 50.00,  date: '2026-03-22T16:45:00Z', status: 'completed' },
            { id: 'tx_005', type: 'shop',  name: 'Coffee Shop Pi Pay',        amount: -2.75,  date: '2026-03-21T08:20:00Z', status: 'completed' }
        ]
    }
};

// Current logged-in user (simplified — no auth for demo)
const CURRENT_USER = 'pioneer';

// --------------- Helpers ---------------
function generateTxId() {
    return 'tx_' + crypto.randomBytes(8).toString('hex');
}

function formatDate(d) {
    return new Date(d).toISOString();
}

// --------------- API Routes ---------------

/** Health / server status */
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        server: 'Visual Pi Card Server',
        domain: 'pivisualcard.online',
        ip: '198.54.116.227',
        version: '1.0.0',
        network: 'Pi Network Mainnet',
        timestamp: new Date().toISOString()
    });
});

/** Get user profile + balance */
app.get('/api/user', (req, res) => {
    const user = users[CURRENT_USER];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        balance: user.balance,
        piAddress: user.piAddress,
        cardType: user.cardType
    });
});

/** Get transaction history */
app.get('/api/transactions', (req, res) => {
    const user = users[CURRENT_USER];
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Return newest first
    const sorted = [...user.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ transactions: sorted });
});

/** Send Pi to another user */
app.post('/api/send', (req, res) => {
    const user = users[CURRENT_USER];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { recipient, amount, note } = req.body;
    if (!recipient || typeof recipient !== 'string') {
        return res.status(400).json({ error: 'Recipient username is required' });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }
    if (parsedAmount > user.balance) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }

    user.balance -= parsedAmount;
    const tx = {
        id: generateTxId(),
        type: 'sent',
        name: 'Sent to @' + recipient.replace(/^@/, ''),
        amount: -parsedAmount,
        date: formatDate(new Date()),
        note: note || '',
        status: 'completed'
    };
    user.transactions.unshift(tx);

    res.json({
        success: true,
        message: 'Sent ' + parsedAmount.toFixed(2) + ' π to @' + recipient.replace(/^@/, ''),
        transaction: tx,
        newBalance: user.balance
    });
});

/** Receive Pi — returns user's Pi address */
app.get('/api/receive', (req, res) => {
    const user = users[CURRENT_USER];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
        piAddress: user.piAddress,
        username: user.username,
        qrData: 'pi://' + user.piAddress
    });
});

/** Pay Merchant */
app.post('/api/pay', (req, res) => {
    const user = users[CURRENT_USER];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { merchant, amount, note } = req.body;
    if (!merchant || typeof merchant !== 'string') {
        return res.status(400).json({ error: 'Merchant ID or name is required' });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }
    if (parsedAmount > user.balance) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }

    user.balance -= parsedAmount;
    const tx = {
        id: generateTxId(),
        type: 'shop',
        name: 'Paid ' + merchant,
        amount: -parsedAmount,
        date: formatDate(new Date()),
        note: note || '',
        status: 'completed'
    };
    user.transactions.unshift(tx);

    res.json({
        success: true,
        message: 'Paid ' + parsedAmount.toFixed(2) + ' π to ' + merchant,
        transaction: tx,
        newBalance: user.balance
    });
});

/** Top Up card balance */
app.post('/api/topup', (req, res) => {
    const user = users[CURRENT_USER];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { amount } = req.body;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    user.balance += parsedAmount;
    const tx = {
        id: generateTxId(),
        type: 'recv',
        name: 'Card Top Up',
        amount: parsedAmount,
        date: formatDate(new Date()),
        status: 'completed'
    };
    user.transactions.unshift(tx);

    res.json({
        success: true,
        message: 'Topped up ' + parsedAmount.toFixed(2) + ' π',
        transaction: tx,
        newBalance: user.balance
    });
});

/** Update card type preference */
app.post('/api/card-type', (req, res) => {
    const user = users[CURRENT_USER];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { cardType } = req.body;
    const allowed = ['visa', 'mastercard', 'black', 'gold', 'platinum', 'amex'];
    if (!allowed.includes(cardType)) {
        return res.status(400).json({ error: 'Invalid card type' });
    }

    user.cardType = cardType;
    res.json({ success: true, cardType: user.cardType });
});

// --------------- Start Server ---------------
app.listen(PORT, HOST, () => {
    console.log('');
    console.log('  ╔════════════════════════════════════════════════╗');
    console.log('  ║     VISUAL PI CARD SERVER  v1.0.0              ║');
    console.log('  ║     pivisualcard.online  (198.54.116.227)      ║');
    console.log('  ╠════════════════════════════════════════════════╣');
    console.log('  ║  Local:   http://localhost:' + PORT + '                ║');
    console.log('  ║  Server:  http://198.54.116.227:' + PORT + '           ║');
    console.log('  ║  Domain:  https://pivisualcard.online          ║');
    console.log('  ║  API:     https://pivisualcard.online/api      ║');
    console.log('  ╚════════════════════════════════════════════════╝');
    console.log('');
});
