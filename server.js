/**
 * Visual Pi Card — Backend Server
 * omendapipaysglobel.online (109.199.109.143)
 * Pi Network Visual Payment Card API
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Load .env file if present
try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
            const match = line.match(/^([^#=]+)=(.*)$/);
            if (match) process.env[match[1].trim()] = match[2].trim();
        });
    }
} catch(e) { /* .env not found — use system env */ }

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Pi Network API configuration
const PI_API_URL = 'https://api.minepi.com/v2';
const PI_API_KEY = process.env.PI_API_KEY || ''; // Set via environment variable

// --------------- Middleware ---------------
app.use(cors({
    origin: ['https://omendapipaysglobel.online', 'http://omendapipaysglobel.online', 'http://109.199.109.143', 'https://109.199.109.143', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Prevent direct public access to local server source and sensitive project files
app.use((req, res, next) => {
    const forbiddenPaths = ['/server.js', '/server.mjs', '/.env', '/package.json', '/package-lock.json', '/yarn.lock'];
    if (forbiddenPaths.includes(req.path) || req.path.startsWith('/.')) {
        return res.status(404).end();
    }
    next();
});

app.use(express.static(path.join(__dirname), { index: false }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pi visual card.html'));
});

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
        domain: 'omendapipaysglobel.online',
        ip: '109.199.109.143',
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

/** Get dashboard summary data */
app.get('/api/dashboard', (req, res) => {
    const user = users[CURRENT_USER];
    if (!user) return res.status(404).json({ error: 'User not found' });
    const sortedTransactions = [...user.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        balance: user.balance,
        piAddress: user.piAddress,
        cardType: user.cardType,
        transactionCount: sortedTransactions.length,
        recentTransactions: sortedTransactions.slice(0, 5),
        transactions: sortedTransactions
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
            console.error('Approve API failed:', result.status, result.data);
            res.status(result.status || 500).json({ success: false, error: 'Approval failed', details: result.data });
        }
    } catch(err) {
        console.error('Approve API error:', err.message);
        res.status(500).json({ success: false, error: 'Approval failed', message: err.message });
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
            console.error('Complete API failed:', result.status, result.data);
            res.status(result.status || 500).json({ success: false, error: 'Completion failed', details: result.data });
        }
    } catch(err) {
        console.error('Complete API error:', err.message);
        res.status(500).json({ success: false, error: 'Completion failed', message: err.message });
    }
});

/** Server-side cancellation of a payment */
app.post('/api/pi/cancel', async (req, res) => {
    const { paymentId } = req.body;
    if (!paymentId) return res.status(400).json({ error: 'paymentId required' });

    if (!PI_API_KEY) {
        console.warn('PI_API_KEY not set — cancelling in demo mode');
        return res.json({ success: true, demo: true });
    }

    try {
        const result = await piApiCall('POST', '/payments/' + encodeURIComponent(paymentId) + '/cancel');
        console.log('Payment cancelled:', paymentId);
        res.json({ success: true, payment: result.data });
    } catch(err) {
        console.error('Cancel API error:', err.message);
        res.status(500).json({ success: false, error: 'Cancellation failed', message: err.message });
    }
});

/** Handle payment error — log and acknowledge */
app.post('/api/pi/error', async (req, res) => {
    const { paymentId, error } = req.body;
    console.error('Payment error reported:', paymentId, error);
    res.json({ success: true, acknowledged: true });
});

/** Handle incomplete payment found during authentication */
app.post('/api/pi/incomplete', async (req, res) => {
    const { paymentId } = req.body;
    if (!paymentId) return res.status(400).json({ error: 'paymentId required' });

    if (!PI_API_KEY) {
        return res.json({ success: true, demo: true });
    }

    try {
        // Fetch payment status to decide next action
        const result = await piApiCall('GET', '/payments/' + encodeURIComponent(paymentId));
        if (result.status === 200) {
            const payment = result.data;
            const txid = payment.transaction && payment.transaction.txid;
            const approved = payment.status && payment.status.developer_approved;

            if (txid) {
                // Has txid — complete it
                const completeResult = await piApiCall('POST', '/payments/' + encodeURIComponent(paymentId) + '/complete', { txid: txid });
                console.log('Incomplete payment completed:', paymentId);
                res.json({ success: true, action: 'completed', payment: completeResult.data });
            } else if (!approved) {
                // Not yet approved — approve it
                const approveResult = await piApiCall('POST', '/payments/' + encodeURIComponent(paymentId) + '/approve');
                console.log('Incomplete payment approved:', paymentId);
                res.json({ success: true, action: 'approved', payment: approveResult.data });
            } else {
                // Approved but no txid — waiting for blockchain
                console.log('Incomplete payment pending blockchain:', paymentId);
                res.json({ success: true, action: 'pending', payment: payment });
            }
        } else {
            res.status(result.status || 500).json({ success: false, error: result.data });
        }
    } catch(err) {
        console.error('Incomplete handler error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// --------------- A2U (App-to-User) Payment ---------------

/** Create an A2U payment — server sends Pi to a user */
app.post('/api/pi/a2u', async (req, res) => {
    const { amount, memo, uid, metadata } = req.body;
    if (!amount || !uid) {
        return res.status(400).json({ error: 'amount and uid required' });
    }
    if (typeof amount !== 'number' || amount <= 0 || amount > 10000) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!PI_API_KEY) {
        console.warn('PI_API_KEY not set — A2U in demo mode');
        return res.json({ success: true, demo: true, txid: 'demo_' + Date.now() });
    }

    try {
        // Step 1: Create A2U payment via Pi Platform API
        // A2U payments are created server-side, NOT through the SDK
        const createResult = await piApiCall('POST', '/payments', {
            payment: {
                amount: amount,
                memo: memo || 'Visual Pi Card A2U Payment',
                metadata: metadata || {},
                uid: uid
            }
        });

        if (createResult.status !== 200 && createResult.status !== 201) {
            console.error('A2U create failed:', createResult.data);
            return res.status(createResult.status || 500).json({ success: false, error: createResult.data });
        }

        const payment = createResult.data;
        const paymentId = payment.identifier;
        console.log('A2U payment created:', paymentId);

        // Step 2: No approval needed for A2U — the flow starts from the app side
        // Pi Platform handles the blockchain submission automatically
        // Poll for the transaction to be submitted
        let txid = null;
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 2000)); // wait 2s between polls
            const statusResult = await piApiCall('GET', '/payments/' + encodeURIComponent(paymentId));
            if (statusResult.status === 200 && statusResult.data) {
                const txData = statusResult.data.transaction;
                if (txData && txData.txid) {
                    txid = txData.txid;
                    break;
                }
                // If status is cancelled or error, bail
                if (statusResult.data.status && statusResult.data.status.cancelled) {
                    return res.json({ success: false, error: 'Payment was cancelled' });
                }
            }
        }

        if (!txid) {
            console.warn('A2U txid not received in time for:', paymentId);
            return res.json({ success: true, paymentId: paymentId, pending: true, message: 'Payment created, awaiting blockchain confirmation' });
        }

        // Step 3: Complete the payment with the txid
        const completeResult = await piApiCall('POST', '/payments/' + encodeURIComponent(paymentId) + '/complete', { txid: txid });
        if (completeResult.status === 200) {
            console.log('A2U payment completed:', paymentId, 'txid:', txid);
            res.json({ success: true, paymentId: paymentId, txid: txid });
        } else {
            console.error('A2U complete failed:', completeResult.data);
            res.json({ success: true, paymentId: paymentId, txid: txid, completeError: completeResult.data });
        }
    } catch(err) {
        console.error('A2U error:', err.message);
        res.status(500).json({ error: 'A2U payment failed', message: err.message });
    }
});

/** Check A2U payment status */
app.get('/api/pi/a2u/status/:paymentId', async (req, res) => {
    const { paymentId } = req.params;
    if (!paymentId) return res.status(400).json({ error: 'paymentId required' });

    if (!PI_API_KEY) {
        return res.json({ success: true, demo: true, status: 'completed' });
    }

    try {
        const result = await piApiCall('GET', '/payments/' + encodeURIComponent(paymentId));
        if (result.status === 200) {
            res.json({ success: true, payment: result.data });
        } else {
            res.status(result.status || 500).json({ success: false, error: result.data });
        }
    } catch(err) {
        res.status(500).json({ error: 'Status check failed', message: err.message });
    }
});

// --------------- Start Server ---------------
app.listen(PORT, HOST, () => {
    console.log('');
    console.log('  ╔════════════════════════════════════════════════╗');
    console.log('  ║     VISUAL PI CARD SERVER  v1.0.0              ║');
    console.log('  ║  omendapipaysglobel.online (109.199.109.143)    ║');
    console.log('  ╠════════════════════════════════════════════════╣');
    console.log('  ║  Local:   http://localhost:' + PORT + '                ║');
    console.log('  ║  Server:  http://109.199.109.143:' + PORT + '          ║');
    console.log('  ║  Domain:  https://omendapipaysglobel.online    ║');
    console.log('  ║  API:     https://omendapipaysglobel.online/api║');
    console.log('  ╚════════════════════════════════════════════════╝');
    console.log('');
});
