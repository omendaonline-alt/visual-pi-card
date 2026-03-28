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

// Pi Network API configuration
const PI_API_URL = 'https://api.minepi.com/v2';
const PI_API_KEY = process.env.PI_API_KEY || ''; // Set via environment variable

// --------------- Middleware ---------------
app.use(cors({
    origin: ['https://pivisualcard.online', 'http://pivisualcard.online', 'http://198.54.116.227', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
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

// --------------- Pi Network API Routes ---------------

/** Helper: call Pi Platform API */
function piApiCall(method, endpoint, body) {
    const https = require('https');
    const url = new URL(PI_API_URL + endpoint);
    return new Promise((resolve, reject) => {
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: method,
            headers: {
                'Authorization': 'Key ' + PI_API_KEY,
                'Content-Type': 'application/json'
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
                catch(e) { resolve({ status: res.statusCode, data: data }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

/** Verify Pi user access token */
app.post('/api/pi/verify', async (req, res) => {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'Access token required' });

    try {
        const https = require('https');
        const url = new URL(PI_API_URL + '/me');
        const result = await new Promise((resolve, reject) => {
            const options = {
                hostname: url.hostname,
                path: url.pathname,
                method: 'GET',
                headers: { 'Authorization': 'Bearer ' + accessToken }
            };
            const request = https.request(options, (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    try { resolve({ status: response.statusCode, data: JSON.parse(data) }); }
                    catch(e) { resolve({ status: response.statusCode, data: data }); }
                });
            });
            request.on('error', reject);
            request.end();
        });

        if (result.status === 200) {
            res.json({ success: true, user: result.data });
        } else {
            res.status(401).json({ error: 'Invalid access token', details: result.data });
        }
    } catch(err) {
        res.status(500).json({ error: 'Verification failed', message: err.message });
    }
});

/** Server-side approval of a payment */
app.post('/api/pi/approve', async (req, res) => {
    const { paymentId } = req.body;
    if (!paymentId) return res.status(400).json({ error: 'paymentId required' });

    if (!PI_API_KEY) {
        console.warn('PI_API_KEY not set — approving in demo mode');
        return res.json({ success: true, demo: true });
    }

    try {
        const result = await piApiCall('POST', '/payments/' + encodeURIComponent(paymentId) + '/approve');
        if (result.status === 200) {
            console.log('Payment approved:', paymentId);
            res.json({ success: true, payment: result.data });
        } else {
            console.error('Approve failed:', result.data);
            res.status(result.status).json({ success: false, error: result.data });
        }
    } catch(err) {
        res.status(500).json({ error: 'Approval failed', message: err.message });
    }
});

/** Server-side completion of a payment */
app.post('/api/pi/complete', async (req, res) => {
    const { paymentId, txid } = req.body;
    if (!paymentId) return res.status(400).json({ error: 'paymentId required' });

    if (!PI_API_KEY) {
        console.warn('PI_API_KEY not set — completing in demo mode');
        return res.json({ success: true, demo: true });
    }

    try {
        const result = await piApiCall('POST', '/payments/' + encodeURIComponent(paymentId) + '/complete', { txid: txid });
        if (result.status === 200) {
            console.log('Payment completed:', paymentId, 'txid:', txid);
            res.json({ success: true, payment: result.data });
        } else {
            console.error('Complete failed:', result.data);
            res.status(result.status).json({ success: false, error: result.data });
        }
    } catch(err) {
        res.status(500).json({ error: 'Completion failed', message: err.message });
    }
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
