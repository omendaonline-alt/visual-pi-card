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

app.use((req, res, next) => {
    const decoded = decodeURIComponent(req.path || '');
    if (decoded === '/visual pi card/ride.html' || decoded === '/visual%20pi%20card/ride.html') {
        return res.redirect(301, '/ride.html');
    }
    if (decoded.includes('/visual pi card') || req.path.includes('/visual%20pi%20card')) {
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

// --------------- Language catalog ---------------
const languageCatalog = {
    en: {
        label: 'English',
        dir: 'ltr',
        pageTitle: 'Omenda AI Knowledge',
        description: 'Your local AI assistant for everything related to Omenda Pi Pays, GCV pricing, and the future of Pi.',
        back: '← Back to Marketplace',
        card1Title: 'Omenda Pi Pays Overview',
        card1Text: 'Omenda Pi Pays brings Pi Network payments, digital cards, and business services together in one hub. It enables wallet access, merchant payments, and global marketplace discovery.',
        card2Title: 'GCV Price Intelligence',
        card2Text: 'GCV is the Global Commerce Value index for Omenda Pi Pays. It reflects marketplace demand, Pi adoption, and service usage across the ecosystem.',
        card3Title: 'Pi Future Vision',
        card3Text: 'Pi is building toward worldwide payments, merchant adoption, cross-border transfers, and decentralized commerce. Omenda AI tracks this future through product, price, and ecosystem signals.',
        askHeading: 'Ask Omenda AI',
        placeholder: 'Ask about Omenda Pi Pays, GCV price, Pi future, products, or services...',
        button: 'Get Answer',
        responseDefault: 'Type a question and click Get Answer to see curated Omenda AI knowledge.',
        responseEmpty: 'Please enter a question about Omenda Pi Pays, GCV price, or Pi future.',
        responseNotFound: 'Omenda AI is learning. For now, here is what we know: Omenda Pi Pays is the Pi services platform, GCV price reflects commerce value, and Pi future centers on adoption, payments, and global merchant support.',
        note: 'This assistant uses curated Omenda Pi Pays knowledge for quick answers. It is a local knowledge engine for your dashboard.'
    },
    es: {
        label: 'Español',
        dir: 'ltr',
        pageTitle: 'Conocimiento Omenda AI',
        description: 'Tu asistente local para todo lo relacionado con Omenda Pi Pays, precios GCV y el futuro de Pi.',
        back: '← Volver al Mercado',
        card1Title: 'Resumen de Omenda Pi Pays',
        card1Text: 'Omenda Pi Pays integra pagos Pi Network, tarjetas digitales y servicios empresariales en un solo centro. Permite acceso a la billetera, pagos a comerciantes y descubrimiento de mercado.',
        card2Title: 'Inteligencia de Precio GCV',
        card2Text: 'GCV es el índice de Valor Global de Comercio para Omenda Pi Pays. Refleja la demanda del mercado, la adopción de Pi y el uso de servicios en el ecosistema.',
        card3Title: 'Visión del Futuro de Pi',
        card3Text: 'Pi avanza hacia pagos globales, adopción comercial, transferencias transfronterizas y comercio descentralizado. Omenda AI sigue esta evolución mediante señales de producto, precio y ecosistema.',
        askHeading: 'Pregunta a Omenda AI',
        placeholder: 'Pregunta sobre Omenda Pi Pays, precio GCV, futuro de Pi, productos o servicios...',
        button: 'Obtener respuesta',
        responseDefault: 'Escribe una pregunta y haz clic en Obtener respuesta para ver el conocimiento de Omenda AI.',
        responseEmpty: 'Por favor, ingresa una pregunta sobre Omenda Pi Pays, precio GCV o el futuro de Pi.',
        responseNotFound: 'Omenda AI está aprendiendo. Por ahora, esto es lo que sabemos: Omenda Pi Pays es la plataforma de servicios Pi, el precio GCV refleja el valor comercial y el futuro de Pi se centra en adopción, pagos y comercio global.',
        note: 'Este asistente usa conocimiento curado de Omenda Pi Pays para respuestas rápidas. Es un motor de conocimiento local para tu panel.'
    },
    fr: {
        label: 'Français',
        dir: 'ltr',
        pageTitle: 'Connaissance Omenda AI',
        description: 'Votre assistant local pour tout ce qui concerne Omenda Pi Pays, les prix GCV et l\'avenir de Pi.',
        back: '← Retour au Marché',
        card1Title: 'Aperçu Omenda Pi Pays',
        card1Text: 'Omenda Pi Pays réunit les paiements Pi Network, les cartes numériques et les services d\'entreprise en un seul hub. Il permet l\'accès au portefeuille, les paiements marchands et la découverte de marché.',
        card2Title: 'Intelligence des Prix GCV',
        card2Text: 'GCV est l\'indice de Valeur Globale du Commerce pour Omenda Pi Pays. Il reflète la demande du marché, l\'adoption de Pi et l\'utilisation des services dans l\'écosystème.',
        card3Title: 'Vision du Futur de Pi',
        card3Text: 'Pi construit des paiements mondiaux, l\'adoption marchande, les transferts transfrontaliers et le commerce décentralisé. Omenda AI suit cet avenir via les signaux de produit, prix et écosystème.',
        askHeading: 'Demandez à Omenda AI',
        placeholder: 'Posez une question sur Omenda Pi Pays, le prix GCV, le futur de Pi, les produits ou les services...',
        button: 'Obtenir une réponse',
        responseDefault: 'Tapez une question et cliquez sur Obtenir une réponse pour voir les connaissances Omenda AI.',
        responseEmpty: 'Veuillez saisir une question sur Omenda Pi Pays, le prix GCV ou le futur de Pi.',
        responseNotFound: 'Omenda AI apprend. Pour l\'instant, voici ce que nous savons : Omenda Pi Pays est la plateforme de services Pi, le prix GCV reflète la valeur commerciale et l\'avenir de Pi se concentre sur l\'adoption, les paiements et le commerce mondial.',
        note: 'Cet assistant utilise des connaissances sélectionnées sur Omenda Pi Pays pour des réponses rapides. Il s\'agit d\'un moteur de connaissances local pour votre tableau de bord.'
    },
    pt: {
        label: 'Português',
        dir: 'ltr',
        pageTitle: 'Conhecimento Omenda AI',
        description: 'Seu assistente local para tudo sobre Omenda Pi Pays, preços GCV e o futuro do Pi.',
        back: '← Voltar ao Mercado',
        card1Title: 'Visão Geral Omenda Pi Pays',
        card1Text: 'Omenda Pi Pays reúne pagamentos Pi Network, cartões digitais e serviços empresariais em um só hub. Ele permite acesso à carteira, pagamentos a comerciantes e descoberta de mercado.',
        card2Title: 'Inteligência de Preço GCV',
        card2Text: 'GCV é o índice de Valor Global de Comércio para Omenda Pi Pays. Ele reflete a demanda do mercado, adoção do Pi e uso de serviços no ecossistema.',
        card3Title: 'Visão do Futuro do Pi',
        card3Text: 'Pi está avançando para pagamentos mundiais, adoção comercial, transferências transfronteiriças e comércio descentralizado. Omenda AI acompanha esse futuro por meio de sinais de produto, preço e ecossistema.',
        askHeading: 'Pergunte ao Omenda AI',
        placeholder: 'Pergunte sobre Omenda Pi Pays, preço GCV, futuro do Pi, produtos ou serviços...',
        button: 'Obter resposta',
        responseDefault: 'Digite uma pergunta e clique em Obter resposta para ver o conhecimento Omenda AI.',
        responseEmpty: 'Por favor, insira uma pergunta sobre Omenda Pi Pays, preço GCV ou futuro do Pi.',
        responseNotFound: 'Omenda AI está aprendendo. Por enquanto, aqui está o que sabemos: Omenda Pi Pays é a plataforma de serviços Pi, o preço GCV reflete valor comercial e o futuro do Pi se concentra em adoção, pagamentos e comércio global.',
        note: 'Este assistente usa conhecimento curado do Omenda Pi Pays para respostas rápidas. É um mecanismo de conhecimento local para seu painel.'
    },
    sw: {
        label: 'Kiswahili Tanzania',
        dir: 'ltr',
        pageTitle: 'Maarifa ya Omenda AI',
        description: 'Msaidizi wako wa AI wa ndani kwa kila kitu kinachohusiana na Omenda Pi Pays, bei ya GCV, na mustakabali wa Pi.',
        back: '← Rudi Sokoni',
        card1Title: 'Muhtasari wa Omenda Pi Pays',
        card1Text: 'Omenda Pi Pays inaunganisha malipo ya Pi Network, kadi za dijiti, na huduma za biashara katika kituo kimoja. Inaruhusu ufikiaji wa mkoba, malipo kwa wauzaji, na ugunduzi wa soko la kimataifa.',
        card2Title: 'Ujasusi wa Bei ya GCV',
        card2Text: 'GCV ni faharasa ya Thamani ya Biashara ya Ulimwengu kwa Omenda Pi Pays. Inaonyesha mahitaji ya soko, matumizi ya Pi, na matumizi ya huduma ndani ya mfumo.',
        card3Title: 'Maono ya Mustakabali wa Pi',
        card3Text: 'Pi inaelekea kwenye mtandao wazi wa malipo wenye kukubalika kubwa zaidi kwa wauzaji, uhamisho wa mipakani, na biashara inayotegemea mkoba. Omenda AI inatazama ishara za bei, uzinduzi wa huduma, na upanuzi wa biashara kubashiri mustakabali wa Pi.',
        askHeading: 'Muulize Omenda AI',
        placeholder: 'Uliza kuhusu Omenda Pi Pays, bei ya GCV, mustakabali wa Pi, bidhaa, au huduma...',
        button: 'Pata Jibu',
        responseDefault: 'Andika swali na bonyeza Pata Jibu kuona maarifa ya Omenda AI yaliyopangwa.',
        responseEmpty: 'Tafadhali ingiza swali kuhusu Omenda Pi Pays, bei ya GCV, au mustakabali wa Pi.',
        responseNotFound: 'Omenda AI inajifunza. Kwa sasa, tunajua: Omenda Pi Pays ni jukwaa la huduma za Pi, bei ya GCV inaonyesha thamani ya biashara, na mustakabali wa Pi unaangazia matumizi, malipo, na biashara ya ulimwengu.',
        note: 'Msaidizi huyu hutumia maarifa yaliyopangwa ya Omenda Pi Pays kwa majibu ya haraka. Ni injini ya maarifa ya ndani kwa dashibodi yako.'
    },
    af: {
        label: 'Afrikaans',
        dir: 'ltr',
        pageTitle: 'Omenda AI Kennis',
        description: 'Jou plaaslike AI-assistent vir alles wat verband hou met Omenda Pi Pays, GCV-pryse en die toekoms van Pi.',
        back: '← Terug na Markplek',
        card1Title: 'Omenda Pi Pays Oorsig',
        card1Text: 'Omenda Pi Pays bring Pi Network-betalings, digitale kaarte en besigheidsdienste bymekaar in een sentrum. Dit maak beursietoegang, handelaarbetalings en wêreldmarkontdekking moontlik.',
        card2Title: 'GCV Prysintelligensie',
        card2Text: 'GCV is die Globale Handelwaarde-indeks vir Omenda Pi Pays. Dit weerspieël markvraag, Pi-aanvaarding en diensgebruik in die ekosisteem.',
        card3Title: 'Pi Toekomsvisie',
        card3Text: 'Pi bou na wêreldwye betalings, handelaaraanvaarding, grensoverschrijdende oordraginge en gedesentraliseerde handel. Omenda AI volg hierdie toekoms deur produk-, prys- en ekosisteemseine.',
        askHeading: 'Vra Omenda AI',
        placeholder: 'Vra oor Omenda Pi Pays, GCV-prys, Pi-toekoms, produkte of dienste...',
        button: 'Kry Antwoord',
        responseDefault: 'Tik ’n vraag in en klik op Kry Antwoord om gekureerde Omenda AI-kennis te sien.',
        responseEmpty: 'Voer asseblief ’n vraag in oor Omenda Pi Pays, GCV-prys of Pi-toekoms.',
        responseNotFound: 'Omenda AI leer. Vir nou weet ons: Omenda Pi Pays is die Pi-diensplatform, GCV-prys weerspieël handelswaarde, en Pi-toekoms fokus op aanvaarding, betalings en wêreldhandel.',
        note: 'Hierdie assistent gebruik gekureerde Omenda Pi Pays-kennis vir vinnige antwoorde. Dit is ’n plaaslike kennis-enjin vir jou paneelbord.'
    },
    zh: {
        label: '中文',
        dir: 'ltr',
        pageTitle: 'Omenda AI 知识',
        description: '您的本地 AI 助手，帮助了解 Omenda Pi Pays、GCV 价格和 Pi 的未来。',
        back: '← 返回市场',
        card1Title: 'Omenda Pi Pays 概览',
        card1Text: 'Omenda Pi Pays 将 Pi 网络支付、数字卡和商业服务整合到一个中心。它支持钱包访问、商家支付和全球市场发现。',
        card2Title: 'GCV 价格情报',
        card2Text: 'GCV 是 Omenda Pi Pays 的全球商业价值指数。它反映了市场需求、Pi 采用率和生态系统内服务使用情况。',
        card3Title: 'Pi 未来愿景',
        card3Text: 'Pi 正朝着全球支付、商家采用、跨境转账和去中心化商业发展。Omenda AI 通过产品、价格和生态信号追踪这一未来。',
        askHeading: '询问 Omenda AI',
        placeholder: '询问有关 Omenda Pi Pays、GCV 价格、Pi 未来、产品或服务的问题...',
        button: '获取答案',
        responseDefault: '输入问题并点击获取答案，以查看 Omenda AI 的精选知识。',
        responseEmpty: '请输入有关 Omenda Pi Pays、GCV 价格或 Pi 未来的问题。',
        responseNotFound: 'Omenda AI 正在学习。当前我们知道：Omenda Pi Pays 是 Pi 服务平台，GCV 价格反映商业价值，Pi 的未来集中在采用、支付和全球商业。',
        note: '该助手使用 Omenda Pi Pays 的精选知识提供快速回答。它是您的本地仪表板知识引擎。'
    },
    ar: {
        label: 'العربية',
        dir: 'rtl',
        pageTitle: 'معرفة Omenda AI',
        description: 'مساعدك المحلي لكل ما يتعلق بـ Omenda Pi Pays، وسعر GCV، ومستقبل Pi.',
        back: '← العودة إلى السوق',
        card1Title: 'نظرة عامة على Omenda Pi Pays',
        card1Text: 'يجمع Omenda Pi Pays بين مدفوعات Pi Network، البطاقات الرقمية، وخدمات الأعمال في مكان واحد. يتيح الوصول إلى المحفظة، مدفوعات التجار، واكتشاف السوق العالمي.',
        card2Title: 'ذكاء سعر GCV',
        card2Text: 'GCV هو مؤشر القيمة التجارية العالمية لـ Omenda Pi Pays. يعكس طلب السوق، تبني Pi، واستخدام الخدمات في النظام البيئي.',
        card3Title: 'رؤية مستقبل Pi',
        card3Text: 'تتجه Pi نحو المدفوعات العالمية، تبني التجار، التحويلات عبر الحدود، والتجارة اللامركزية. يتتبع Omenda AI هذا المستقبل من خلال إشارات المنتج والسعر والنظام البيئي.',
        askHeading: 'اسأل Omenda AI',
        placeholder: 'اسأل عن Omenda Pi Pays، سعر GCV، مستقبل Pi، المنتجات، أو الخدمات...',
        button: 'الحصول على إجابة',
        responseDefault: 'اكتب سؤالاً وانقر على الحصول على إجابة لعرض معرفة Omenda AI.',
        responseEmpty: 'يرجى إدخال سؤال حول Omenda Pi Pays أو سعر GCV أو مستقبل Pi.',
        responseNotFound: 'Omenda AI يتعلم. في الوقت الحالي، هذا ما نعرفه: Omenda Pi Pays هو منصة خدمات Pi، وسعر GCV يعكس القيمة التجارية، ومستقبل Pi يركز على التبني والمدفوعات والتجارة العالمية.',
        note: 'يستخدم هذا المساعد معرفة Omenda Pi Pays المنسقة للحصول على إجابات سريعة. إنه محرك معرفة محلي للوحة التحكم الخاصة بك.'
    }
};

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

/** Get localized UI strings and translations */
app.get('/api/i18n', (req, res) => {
    const requested = (req.query.lang || 'en').toLowerCase();
    const supported = Object.keys(languageCatalog);
    if (supported.includes(requested)) {
        return res.json({
            success: true,
            lang: requested,
            translations: languageCatalog[requested]
        });
    }
    return res.json({
        success: true,
        lang: 'en',
        translations: languageCatalog['en'],
        supported: supported
    });
});

app.get('/api/languages', (req, res) => {
    const langs = Object.keys(languageCatalog).map(code => ({ code, label: languageCatalog[code].label }));
    res.json({ success: true, languages: langs });
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

/** Card payment simulation */
app.post('/api/card-pay', (req, res) => {
    const user = users[CURRENT_USER];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { amount, merchant, note, cardNumber, expiry, cvv, name, metadata } = req.body;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }
    if (!merchant || typeof merchant !== 'string') {
        return res.status(400).json({ error: 'Merchant name is required' });
    }
    if (!cardNumber || !expiry || !cvv || !name) {
        return res.status(400).json({ error: 'Incomplete card details' });
    }

    const tx = {
        id: generateTxId(),
        type: 'card',
        name: 'Card payment to ' + merchant,
        amount: -parsedAmount,
        date: formatDate(new Date()),
        note: note || '',
        status: 'completed',
        cardLast4: cardNumber.toString().slice(-4),
        metadata: metadata || {}
    };
    user.transactions.unshift(tx);

    res.json({
        success: true,
        message: 'Card payment confirmed',
        transaction: tx
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
