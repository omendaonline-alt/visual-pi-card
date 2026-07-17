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
app.use(express.json({ limit: '8mb' }));

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
    res.sendFile(path.join(__dirname, 'index.html'));
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

const mapResponseCache = new Map();
const MAP_CACHE_TTL_MS = 15 * 60 * 1000;
const FLIGHT_BOOKINGS_PATH = path.join(__dirname, 'data', 'flight-bookings.json');
const DELIVERY_NETWORK_PATH = path.join(__dirname, 'data', 'delivery-network.json');
const DELIVERY_ADMIN_KEY_PATH = path.join(__dirname, '.delivery-admin-key');
const DELIVERY_ADMIN_KEY = process.env.DELIVERY_ADMIN_KEY || (() => {
    try {
        return fs.readFileSync(DELIVERY_ADMIN_KEY_PATH, 'utf8').trim();
    } catch (err) {
        return '';
    }
})();

// --------------- Helpers ---------------
function generateTxId() {
    return 'tx_' + crypto.randomBytes(8).toString('hex');
}

function formatDate(d) {
    return new Date(d).toISOString();
}

function sanitizeFlightText(value, maxLength) {
    return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}

function readFlightBookings() {
    try {
        if (!fs.existsSync(FLIGHT_BOOKINGS_PATH)) return [];
        const bookings = JSON.parse(fs.readFileSync(FLIGHT_BOOKINGS_PATH, 'utf8'));
        return Array.isArray(bookings) ? bookings : [];
    } catch (err) {
        console.error('Flight booking store read error:', err.message);
        return [];
    }
}

function saveFlightBooking(booking) {
    const bookings = readFlightBookings();
    bookings.unshift(booking);
    fs.mkdirSync(path.dirname(FLIGHT_BOOKINGS_PATH), { recursive: true });
    fs.writeFileSync(FLIGHT_BOOKINGS_PATH, JSON.stringify(bookings.slice(0, 1000), null, 2));
}

function generateFlightReference() {
    return 'CRF-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
}

function readDeliveryNetwork() {
    const emptyNetwork = { companies: [], agents: [], shipments: [] };
    try {
        if (!fs.existsSync(DELIVERY_NETWORK_PATH)) return emptyNetwork;
        const network = JSON.parse(fs.readFileSync(DELIVERY_NETWORK_PATH, 'utf8'));
        return {
            companies: Array.isArray(network.companies) ? network.companies : [],
            agents: Array.isArray(network.agents) ? network.agents : [],
            shipments: Array.isArray(network.shipments) ? network.shipments : []
        };
    } catch (err) {
        console.error('Delivery network store read error:', err.message);
        return emptyNetwork;
    }
}

function writeDeliveryNetwork(network) {
    fs.mkdirSync(path.dirname(DELIVERY_NETWORK_PATH), { recursive: true });
    const temporaryPath = DELIVERY_NETWORK_PATH + '.tmp';
    fs.writeFileSync(temporaryPath, JSON.stringify(network, null, 2));
    fs.renameSync(temporaryPath, DELIVERY_NETWORK_PATH);
}

function deliveryReference(prefix) {
    return prefix + '-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
}

const TRACKING_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function cargoTrackingChecksum(payload) {
    let total = 0;
    for (let i = 0; i < payload.length; i++) {
        const value = TRACKING_ALPHABET.indexOf(payload[i]);
        total = (total + Math.max(0, value) * (i + 3)) % TRACKING_ALPHABET.length;
    }
    return TRACKING_ALPHABET[total];
}

function generateCargoTrackingNumber() {
    const dateCode = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomCode = crypto.randomBytes(5).toString('hex').toUpperCase();
    const payload = 'CRT' + dateCode + randomCode;
    return 'CRT-' + dateCode + '-' + randomCode + '-' + cargoTrackingChecksum(payload);
}

function generateUniqueCargoTrackingNumber(network) {
    const existing = new Set((network.shipments || []).map(shipment => shipment.trackingNumber));
    for (let attempt = 0; attempt < 20; attempt++) {
        const trackingNumber = generateCargoTrackingNumber();
        if (!existing.has(trackingNumber)) return trackingNumber;
    }
    throw new Error('Unable to allocate a unique cargo tracking number.');
}

function normalizeCargoTrackingNumber(value) {
    const compact = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^CRT\d{6}[A-F0-9]{10}[A-Z0-9]$/.test(compact)) return null;
    const payload = compact.slice(0, -1);
    if (cargoTrackingChecksum(payload) !== compact.slice(-1)) return null;
    return 'CRT-' + compact.slice(3, 9) + '-' + compact.slice(9, 19) + '-' + compact.slice(19);
}

const CARGO_STATUS_TRANSITIONS = {
    quote_pending: ['company_assigned', 'cancelled'],
    company_assigned: ['pickup_scheduled', 'picked_up', 'cancelled'],
    pickup_scheduled: ['picked_up', 'cancelled'],
    picked_up: ['in_transit', 'delivery_exception', 'return_initiated'],
    in_transit: ['customs_hold', 'customs_clearance', 'out_for_delivery', 'delivery_exception', 'return_initiated'],
    customs_hold: ['customs_clearance', 'delivery_exception', 'return_initiated'],
    customs_clearance: ['in_transit', 'out_for_delivery', 'delivery_exception'],
    out_for_delivery: ['delivered', 'delivery_attempted', 'delivery_exception'],
    delivery_attempted: ['out_for_delivery', 'return_initiated'],
    delivery_exception: ['in_transit', 'out_for_delivery', 'return_initiated', 'cancelled'],
    return_initiated: ['returning_to_sender'],
    returning_to_sender: ['returned_to_sender'],
    delivered: [],
    cancelled: [],
    returned_to_sender: []
};

const CARGO_TERMINAL_STATUSES = new Set(['delivered', 'cancelled', 'returned_to_sender']);

function cargoStatusLabel(status) {
    return String(status || '').replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function publicCargoTracking(shipment) {
    return {
        trackingNumber: shipment.trackingNumber,
        reference: shipment.reference,
        status: shipment.status,
        origin: shipment.origin,
        destination: shipment.destination,
        cargoType: shipment.cargoType,
        weightKg: shipment.weightKg,
        companyPreference: shipment.companyPreference,
        assignedCompany: shipment.assignedCompany || '',
        assignedAgent: shipment.assignedAgent || '',
        estimatedDeliveryDate: shipment.estimatedDeliveryDate || '',
        latestLocation: shipment.latestLocation || shipment.origin,
        version: Number(shipment.trackingVersion) || 1,
        createdAt: shipment.createdAt,
        events: (Array.isArray(shipment.trackingEvents) ? shipment.trackingEvents : []).map(event => ({
            status: event.status,
            label: event.label,
            location: event.location,
            timestamp: event.timestamp
        })),
        allowedNext: CARGO_STATUS_TRANSITIONS[shipment.status] || []
    };
}

function deliveryAdminAuthorized(req) {
    if (!DELIVERY_ADMIN_KEY) return false;
    const provided = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(DELIVERY_ADMIN_KEY);
    return providedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

function publicDeliveryEntry(entry) {
    const publicEntry = Object.assign({}, entry);
    delete publicEntry.contact;
    return publicEntry;
}

function getCachedMapResponse(key) {
    const cached = mapResponseCache.get(key);
    if (!cached || Date.now() - cached.savedAt > MAP_CACHE_TTL_MS) {
        mapResponseCache.delete(key);
        return null;
    }
    return cached.value;
}

function cacheMapResponse(key, value) {
    mapResponseCache.set(key, { savedAt: Date.now(), value });
    if (mapResponseCache.size > 250) {
        mapResponseCache.delete(mapResponseCache.keys().next().value);
    }
}

async function fetchMapJson(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'OmendaPiPaysGlobal/1.0 (https://omendapipaysglobel.online)'
            },
            signal: controller.signal
        });
        if (!response.ok) throw new Error(`Map provider returned ${response.status}`);
        return await response.json();
    } finally {
        clearTimeout(timeout);
    }
}

// --------------- Social Store Helpers ---------------
const SOCIAL_STORE_PATH = path.join(__dirname, 'data', 'social-store.json');
const socialSeedPosts = [
    {
        id: 'omenda-launch',
        handle: '@OmendaOfficial',
        name: 'Omenda Official',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop',
        image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=1200&auto=format&fit=crop',
        caption: 'Discover how creators can tag products inside posts and let customers checkout directly from the feed.',
        label: 'Shop-ready social commerce',
        userSub: 'Official community updates',
        createdAt: '2026-07-17T00:00:00.000Z',
        baseLikes: 248,
        baseComments: 18
    },
    {
        id: 'pi-travel-sunrise',
        handle: '@PiTravel',
        name: 'Pi Travel',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop',
        image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop',
        caption: 'Travel with Pi and capture moments from trusted local guides, sellers, and Portals.',
        label: 'Travel stories',
        userSub: 'Travel stories',
        createdAt: '2026-07-16T21:00:00.000Z',
        baseLikes: 412,
        baseComments: 32
    },
    {
        id: 'market-pulse',
        handle: '@MarketPulse',
        name: 'Market Pulse',
        avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=400&auto=format&fit=crop',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1200&auto=format&fit=crop',
        caption: 'From fashion to gadgets, every discovery is connected with Pi commerce.',
        label: 'Marketplace pulse',
        userSub: 'Local goods & offers',
        createdAt: '2026-07-16T00:00:00.000Z',
        baseLikes: 176,
        baseComments: 14
    }
];

function normalizeSocialHandle(value) {
    let handle = String(value || '').trim().replace(/\s+/g, '');
    if (!handle) handle = '@OmendaCreator';
    if (!handle.startsWith('@')) handle = '@' + handle;
    handle = '@' + handle.slice(1).replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 31);
    return handle.length > 1 ? handle : '@OmendaCreator';
}

function sanitizeSocialText(value, maxLength) {
    return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}

function defaultSocialStore() {
    return { version: 1, accounts: {}, posts: [], likes: {}, saves: {}, comments: {}, follows: {}, createdAt: new Date().toISOString() };
}

function readSocialStore() {
    try {
        if (!fs.existsSync(SOCIAL_STORE_PATH)) return defaultSocialStore();
        const store = JSON.parse(fs.readFileSync(SOCIAL_STORE_PATH, 'utf8'));
        return Object.assign(defaultSocialStore(), store);
    } catch (err) {
        console.error('Social store read error:', err.message);
        return defaultSocialStore();
    }
}

function writeSocialStore(store) {
    fs.mkdirSync(path.dirname(SOCIAL_STORE_PATH), { recursive: true });
    fs.writeFileSync(SOCIAL_STORE_PATH, JSON.stringify(store, null, 2));
}

function ensureSocialAccount(store, handle, profile) {
    const normalized = normalizeSocialHandle(handle);
    const existing = store.accounts[normalized] || {};
    store.accounts[normalized] = {
        handle: normalized,
        name: sanitizeSocialText((profile && profile.name) || existing.name || normalized.replace('@', ''), 60),
        avatar: sanitizeSocialText((profile && profile.avatar) || existing.avatar || 'icon-192.svg', 500),
        bio: sanitizeSocialText((profile && profile.bio) || existing.bio || 'Omenda social creator', 160),
        updatedAt: new Date().toISOString(),
        createdAt: existing.createdAt || new Date().toISOString()
    };
    return store.accounts[normalized];
}

function listSocialUsers(values) {
    return Array.isArray(values) ? values.map(normalizeSocialHandle).filter(Boolean) : [];
}

function buildSocialPost(store, post, viewer) {
    const viewerHandle = normalizeSocialHandle(viewer);
    const likes = listSocialUsers(store.likes[post.id]);
    const saves = listSocialUsers(store.saves[post.id]);
    const comments = Array.isArray(store.comments[post.id]) ? store.comments[post.id] : [];
    const followers = Object.entries(store.follows || {}).filter(([, following]) => listSocialUsers(following).includes(post.handle)).length;
    const following = listSocialUsers((store.follows || {})[viewerHandle]).includes(post.handle);
    return Object.assign({}, post, {
        likeCount: Number(post.baseLikes || 0) + likes.length,
        commentCount: Number(post.baseComments || 0) + comments.length,
        saveCount: saves.length,
        liked: likes.includes(viewerHandle),
        saved: saves.includes(viewerHandle),
        following,
        followerCount: followers,
        comments: comments.slice(-20)
    });
}

function getAllSocialPosts(store) {
    return [...store.posts, ...socialSeedPosts].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
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

/** Worldwide place search powered by OpenStreetMap data through Photon. */
app.get('/api/geocode', async (req, res) => {
    const query = String(req.query.q || '').trim().slice(0, 180);
    if (query.length < 3) {
        return res.status(400).json({ success: false, error: 'Enter at least 3 characters.' });
    }

    const cacheKey = `geocode:${query.toLowerCase()}`;
    const cached = getCachedMapResponse(cacheKey);
    if (cached) return res.json(cached);

    try {
        const params = new URLSearchParams({ q: query, limit: '6' });
        const places = await fetchMapJson(`https://photon.komoot.io/api/?${params}`);
        const payload = {
            success: true,
            results: (places.features || []).map(place => {
                const properties = place.properties || {};
                const coordinates = place.geometry && place.geometry.coordinates || [];
                const labelParts = [
                    properties.name,
                    properties.housenumber && properties.street ? `${properties.housenumber} ${properties.street}` : properties.street,
                    properties.city || properties.locality || properties.district,
                    properties.state,
                    properties.country
                ].filter((part, index, values) => part && values.indexOf(part) === index);
                return {
                    label: labelParts.join(', '),
                    lat: Number(coordinates[1]),
                    lng: Number(coordinates[0]),
                    countryCode: String(properties.countrycode || '').toUpperCase(),
                    type: properties.type || properties.osm_value || 'place'
                };
            }).filter(place => place.label && Number.isFinite(place.lat) && Number.isFinite(place.lng))
        };
        cacheMapResponse(cacheKey, payload);
        res.json(payload);
    } catch (err) {
        console.error('Geocode error:', err.message);
        res.status(502).json({ success: false, error: 'Worldwide address search is temporarily unavailable.' });
    }
});

/** Worldwide driving route details powered by the public OSRM service. */
app.get('/api/route', async (req, res) => {
    const pickupLat = Number(req.query.pickupLat);
    const pickupLng = Number(req.query.pickupLng);
    const dropoffLat = Number(req.query.dropoffLat);
    const dropoffLng = Number(req.query.dropoffLng);
    const validLat = value => Number.isFinite(value) && value >= -90 && value <= 90;
    const validLng = value => Number.isFinite(value) && value >= -180 && value <= 180;

    if (!validLat(pickupLat) || !validLng(pickupLng) || !validLat(dropoffLat) || !validLng(dropoffLng)) {
        return res.status(400).json({ success: false, error: 'Valid pickup and destination coordinates are required.' });
    }

    const coordinateKey = [pickupLat, pickupLng, dropoffLat, dropoffLng].map(value => value.toFixed(5)).join(',');
    const cacheKey = `route:${coordinateKey}`;
    const cached = getCachedMapResponse(cacheKey);
    if (cached) return res.json(cached);

    try {
        const coordinates = `${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}`;
        const route = await fetchMapJson(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`);
        const best = route.routes && route.routes[0];
        if (!best) return res.status(404).json({ success: false, error: 'No driving route was found between these places.' });
        const payload = {
            success: true,
            distanceKm: Number((best.distance / 1000).toFixed(2)),
            durationMinutes: Math.max(1, Math.round(best.duration / 60)),
            geometry: best.geometry && best.geometry.coordinates || []
        };
        cacheMapResponse(cacheKey, payload);
        res.json(payload);
    } catch (err) {
        console.error('Route lookup error:', err.message);
        res.status(502).json({ success: false, error: 'Worldwide road routing is temporarily unavailable.' });
    }
});

/** Create a worldwide City Rush flight-agent request. */
app.post('/api/flight-bookings', (req, res) => {
    const body = req.body || {};
    const passengerName = sanitizeFlightText(body.passengerName, 80);
    const fromAirport = sanitizeFlightText(body.fromAirport, 120);
    const toAirport = sanitizeFlightText(body.toAirport, 120);
    const departureDate = sanitizeFlightText(body.departureDate, 10);
    const returnDate = sanitizeFlightText(body.returnDate, 10);
    const tripType = body.tripType === 'return' ? 'return' : 'one-way';
    const airline = sanitizeFlightText(body.airline, 100) || 'Any available airline';
    const contact = sanitizeFlightText(body.contact, 120);
    const passengers = Math.min(9, Math.max(1, Number.parseInt(body.passengers, 10) || 1));
    const allowedCabins = ['Economy', 'Premium Economy', 'Business', 'First'];
    const cabin = allowedCabins.includes(body.cabin) ? body.cabin : 'Economy';
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (passengerName.length < 2 || fromAirport.length < 2 || toAirport.length < 2 || !datePattern.test(departureDate)) {
        return res.status(400).json({ success: false, error: 'Passenger, airports, and a valid departure date are required.' });
    }
    if (fromAirport.toLowerCase() === toAirport.toLowerCase()) {
        return res.status(400).json({ success: false, error: 'Departure and destination airports must be different.' });
    }
    if (tripType === 'return' && (!datePattern.test(returnDate) || returnDate < departureDate)) {
        return res.status(400).json({ success: false, error: 'Return date must be on or after the departure date.' });
    }

    const booking = {
        reference: generateFlightReference(),
        status: 'airline_confirmation_pending',
        passengerName,
        fromAirport,
        toAirport,
        departureDate,
        returnDate: tripType === 'return' ? returnDate : '',
        tripType,
        passengers,
        cabin,
        airline,
        contact,
        createdAt: new Date().toISOString()
    };

    try {
        saveFlightBooking(booking);
        res.status(201).json({ success: true, booking });
    } catch (err) {
        console.error('Flight booking save error:', err.message);
        res.status(500).json({ success: false, error: 'Unable to create the flight-agent request.' });
    }
});

app.get('/api/delivery-network', (req, res) => {
    const network = readDeliveryNetwork();
    res.json({
        success: true,
        companies: network.companies.map(publicDeliveryEntry),
        agents: network.agents.map(publicDeliveryEntry)
    });
});

app.post('/api/cargo-companies', (req, res) => {
    const body = req.body || {};
    const company = {
        reference: deliveryReference('CRC'),
        status: 'review_pending',
        name: sanitizeFlightText(body.name, 100),
        country: sanitizeFlightText(body.country, 80),
        city: sanitizeFlightText(body.city, 80),
        serviceType: sanitizeFlightText(body.serviceType, 60),
        coverage: sanitizeFlightText(body.coverage, 160),
        contact: sanitizeFlightText(body.contact, 120),
        createdAt: new Date().toISOString()
    };
    if (company.name.length < 2 || company.country.length < 2 || company.city.length < 2 || company.serviceType.length < 2 || company.contact.length < 3) {
        return res.status(400).json({ success: false, error: 'Company, location, service type, and business contact are required.' });
    }
    try {
        const network = readDeliveryNetwork();
        network.companies.unshift(company);
        network.companies = network.companies.slice(0, 1000);
        writeDeliveryNetwork(network);
        res.status(201).json({ success: true, company });
    } catch (err) {
        console.error('Cargo company save error:', err.message);
        res.status(500).json({ success: false, error: 'Unable to register the cargo company.' });
    }
});

app.post('/api/delivery-agents', (req, res) => {
    const body = req.body || {};
    const agent = {
        reference: deliveryReference('CRA'),
        status: 'review_pending',
        name: sanitizeFlightText(body.name, 80),
        businessName: sanitizeFlightText(body.businessName, 100),
        country: sanitizeFlightText(body.country, 80),
        city: sanitizeFlightText(body.city, 80),
        coverage: sanitizeFlightText(body.coverage, 160),
        vehicle: sanitizeFlightText(body.vehicle, 60),
        contact: sanitizeFlightText(body.contact, 120),
        createdAt: new Date().toISOString()
    };
    if (agent.name.length < 2 || agent.country.length < 2 || agent.city.length < 2 || agent.coverage.length < 2 || agent.vehicle.length < 2 || agent.contact.length < 3) {
        return res.status(400).json({ success: false, error: 'Agent, location, coverage, vehicle, and contact are required.' });
    }
    try {
        const network = readDeliveryNetwork();
        network.agents.unshift(agent);
        network.agents = network.agents.slice(0, 2000);
        writeDeliveryNetwork(network);
        res.status(201).json({ success: true, agent });
    } catch (err) {
        console.error('Delivery agent save error:', err.message);
        res.status(500).json({ success: false, error: 'Unable to register the local agent.' });
    }
});

app.post('/api/cargo-shipments', (req, res) => {
    const body = req.body || {};
    const weightKg = Number(body.weightKg);
    const createdAt = new Date().toISOString();
    const network = readDeliveryNetwork();
    let trackingNumber;
    try {
        trackingNumber = generateUniqueCargoTrackingNumber(network);
    } catch (err) {
        return res.status(503).json({ success: false, error: err.message });
    }
    const shipment = {
        reference: deliveryReference('CRS'),
        trackingNumber,
        status: 'quote_pending',
        senderName: sanitizeFlightText(body.senderName, 80),
        contact: sanitizeFlightText(body.contact, 120),
        origin: sanitizeFlightText(body.origin, 120),
        destination: sanitizeFlightText(body.destination, 120),
        cargoType: sanitizeFlightText(body.cargoType, 60),
        weightKg: Number.isFinite(weightKg) ? Math.max(0.1, Math.min(weightKg, 1000000)) : 0,
        companyPreference: sanitizeFlightText(body.companyPreference, 100) || 'Any available cargo company',
        details: sanitizeFlightText(body.details, 500),
        assignedCompany: '',
        assignedAgent: '',
        estimatedDeliveryDate: '',
        latestLocation: sanitizeFlightText(body.origin, 120),
        trackingVersion: 1,
        createdAt,
        trackingEvents: [{
            status: 'quote_pending',
            label: 'Shipment request created; awaiting cargo company quote',
            location: sanitizeFlightText(body.origin, 120),
            timestamp: createdAt
        }]
    };
    if (shipment.senderName.length < 2 || shipment.contact.length < 3 || shipment.origin.length < 2 || shipment.destination.length < 2 || shipment.cargoType.length < 2 || shipment.weightKg <= 0) {
        return res.status(400).json({ success: false, error: 'Sender, contact, route, cargo type, and weight are required.' });
    }
    if (shipment.origin.toLowerCase() === shipment.destination.toLowerCase()) {
        return res.status(400).json({ success: false, error: 'Cargo origin and destination must be different.' });
    }
    try {
        network.shipments.unshift(shipment);
        network.shipments = network.shipments.slice(0, 3000);
        writeDeliveryNetwork(network);
        res.status(201).json({ success: true, shipment });
    } catch (err) {
        console.error('Cargo shipment save error:', err.message);
        res.status(500).json({ success: false, error: 'Unable to create the shipment request.' });
    }
});

app.get('/api/cargo-tracking/:trackingNumber', (req, res) => {
    const trackingNumber = normalizeCargoTrackingNumber(req.params.trackingNumber);
    if (!trackingNumber) {
        return res.status(400).json({ success: false, error: 'Invalid cargo tracking number or checksum.' });
    }
    const network = readDeliveryNetwork();
    const shipment = network.shipments.find(item => item.trackingNumber === trackingNumber);
    if (!shipment) {
        return res.status(404).json({ success: false, error: 'Cargo tracking number was not found.' });
    }
    res.json({ success: true, tracking: publicCargoTracking(shipment) });
});

app.post('/api/cargo-tracking/:trackingNumber/events', (req, res) => {
    if (!DELIVERY_ADMIN_KEY) {
        return res.status(503).json({ success: false, error: 'Cargo status updates require DELIVERY_ADMIN_KEY configuration.' });
    }
    if (!deliveryAdminAuthorized(req)) {
        return res.status(401).json({ success: false, error: 'Cargo status update is not authorized.' });
    }
    const trackingNumber = normalizeCargoTrackingNumber(req.params.trackingNumber);
    if (!trackingNumber) {
        return res.status(400).json({ success: false, error: 'Invalid cargo tracking number or checksum.' });
    }
    const nextStatus = sanitizeFlightText(req.body && req.body.status, 40).toLowerCase();
    const location = sanitizeFlightText(req.body && req.body.location, 120);
    const note = sanitizeFlightText(req.body && req.body.note, 240);
    const assignedCompany = sanitizeFlightText(req.body && req.body.assignedCompany, 100);
    const assignedAgent = sanitizeFlightText(req.body && req.body.assignedAgent, 80);
    const estimatedDeliveryDate = sanitizeFlightText(req.body && req.body.estimatedDeliveryDate, 10);
    const expectedVersion = Number.parseInt(req.body && req.body.expectedVersion, 10);
    const network = readDeliveryNetwork();
    const shipment = network.shipments.find(item => item.trackingNumber === trackingNumber);
    if (!shipment) {
        return res.status(404).json({ success: false, error: 'Cargo tracking number was not found.' });
    }
    const currentVersion = Number(shipment.trackingVersion) || 1;
    if (!Number.isFinite(expectedVersion)) {
        return res.status(400).json({ success: false, error: 'expectedVersion is required for protected tracking updates.' });
    }
    if (Number.isFinite(expectedVersion) && expectedVersion !== currentVersion) {
        return res.status(409).json({ success: false, error: 'Tracking was updated by another operator. Reload before saving.', current: publicCargoTracking(shipment) });
    }
    if (!Object.hasOwn(CARGO_STATUS_TRANSITIONS, nextStatus)) {
        return res.status(400).json({ success: false, error: 'Unknown cargo status.' });
    }
    const allowed = CARGO_STATUS_TRANSITIONS[shipment.status] || [];
    const isLocationScan = nextStatus === shipment.status && !CARGO_TERMINAL_STATUSES.has(shipment.status) && (location || note);
    if (!allowed.includes(nextStatus) && !isLocationScan) {
        return res.status(409).json({ success: false, error: 'Invalid status transition from ' + shipment.status + ' to ' + nextStatus + '.', allowed });
    }
    if (nextStatus === 'company_assigned' && !(assignedCompany || shipment.assignedCompany)) {
        return res.status(400).json({ success: false, error: 'Assigned company is required for company_assigned status.' });
    }
    if (estimatedDeliveryDate && !/^\d{4}-\d{2}-\d{2}$/.test(estimatedDeliveryDate)) {
        return res.status(400).json({ success: false, error: 'Estimated delivery date must use YYYY-MM-DD.' });
    }
    if (['picked_up', 'in_transit', 'customs_hold', 'customs_clearance', 'out_for_delivery', 'delivery_attempted', 'delivered', 'delivery_exception', 'returning_to_sender', 'returned_to_sender'].includes(nextStatus) && !location) {
        return res.status(400).json({ success: false, error: 'Location is required for this tracking status.' });
    }
    shipment.status = nextStatus;
    if (assignedCompany) shipment.assignedCompany = assignedCompany;
    if (assignedAgent) shipment.assignedAgent = assignedAgent;
    if (estimatedDeliveryDate) shipment.estimatedDeliveryDate = estimatedDeliveryDate;
    if (location) shipment.latestLocation = location;
    shipment.trackingVersion = currentVersion + 1;
    shipment.trackingEvents = Array.isArray(shipment.trackingEvents) ? shipment.trackingEvents : [];
    shipment.trackingEvents.push({
        status: nextStatus,
        label: note || (isLocationScan ? cargoStatusLabel(nextStatus) + ' location scan' : cargoStatusLabel(nextStatus)),
        location: location || shipment.latestLocation || shipment.origin,
        timestamp: new Date().toISOString(),
        updatedBy: 'cargo_operator'
    });
    try {
        writeDeliveryNetwork(network);
        res.json({ success: true, tracking: publicCargoTracking(shipment) });
    } catch (err) {
        console.error('Cargo tracking update error:', err.message);
        res.status(500).json({ success: false, error: 'Unable to update cargo tracking.' });
    }
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

app.get('/api/social/feed', (req, res) => {
    const store = readSocialStore();
    const viewer = normalizeSocialHandle(req.query.viewer || '@OmendaCreator');
    ensureSocialAccount(store, viewer, {});
    writeSocialStore(store);
    const posts = getAllSocialPosts(store).map(post => buildSocialPost(store, post, viewer));
    const following = listSocialUsers((store.follows || {})[viewer]);
    res.json({ success: true, viewer, account: store.accounts[viewer], following, posts });
});

app.post('/api/social/accounts', (req, res) => {
    const store = readSocialStore();
    const account = ensureSocialAccount(store, req.body && req.body.handle, req.body || {});
    writeSocialStore(store);
    res.json({ success: true, account });
});

app.post('/api/social/upload-image', (req, res) => {
    const imageData = String((req.body && req.body.imageData) || '');
    const match = imageData.match(/^data:image\/(png|jpe?g|webp|gif);base64,([a-zA-Z0-9+/=]+)$/);
    if (!match) return res.status(400).json({ success: false, error: 'PNG, JPG, WEBP, or GIF image is required' });

    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length || buffer.length > 4 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: 'Image must be 4MB or smaller' });
    }

    const uploadsDir = path.join(__dirname, 'uploads', 'social');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const fileName = 'social_' + Date.now() + '_' + crypto.randomBytes(5).toString('hex') + '.' + ext;
    fs.writeFileSync(path.join(uploadsDir, fileName), buffer);
    res.json({ success: true, url: '/uploads/social/' + fileName });
});

app.post('/api/social/posts', (req, res) => {
    const store = readSocialStore();
    const handle = normalizeSocialHandle(req.body && req.body.handle);
    const caption = sanitizeSocialText(req.body && req.body.caption, 280) || 'New Omenda social post.';
    const postType = sanitizeSocialText(req.body && req.body.postType, 24) === 'status' ? 'status' : 'photo';
    const image = postType === 'status' ? '' : (sanitizeSocialText(req.body && req.body.image, 500) || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop');
    const account = ensureSocialAccount(store, handle, req.body || {});
    const post = {
        id: 'post_' + crypto.randomBytes(8).toString('hex'),
        postType,
        handle,
        name: account.name,
        avatar: account.avatar,
        image,
        caption,
        label: sanitizeSocialText(req.body && req.body.label, 80) || 'Community post',
        userSub: sanitizeSocialText(req.body && req.body.userSub, 80) || 'Omenda creator post',
        createdAt: new Date().toISOString(),
        baseLikes: 0,
        baseComments: 0
    };
    store.posts.unshift(post);
    store.posts = store.posts.slice(0, 200);
    writeSocialStore(store);
    res.json({ success: true, post: buildSocialPost(store, post, handle) });
});

app.post('/api/social/posts/:postId/like', (req, res) => {
    const store = readSocialStore();
    const handle = normalizeSocialHandle(req.body && req.body.handle);
    const postId = sanitizeSocialText(req.params.postId, 80);
    const post = getAllSocialPosts(store).find(row => row.id === postId);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
    ensureSocialAccount(store, handle, {});
    const likes = new Set(listSocialUsers(store.likes[postId]));
    if (likes.has(handle)) likes.delete(handle); else likes.add(handle);
    store.likes[postId] = Array.from(likes);
    writeSocialStore(store);
    res.json({ success: true, post: buildSocialPost(store, post, handle) });
});

app.post('/api/social/posts/:postId/save', (req, res) => {
    const store = readSocialStore();
    const handle = normalizeSocialHandle(req.body && req.body.handle);
    const postId = sanitizeSocialText(req.params.postId, 80);
    const post = getAllSocialPosts(store).find(row => row.id === postId);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
    ensureSocialAccount(store, handle, {});
    const saves = new Set(listSocialUsers(store.saves[postId]));
    if (saves.has(handle)) saves.delete(handle); else saves.add(handle);
    store.saves[postId] = Array.from(saves);
    writeSocialStore(store);
    res.json({ success: true, post: buildSocialPost(store, post, handle) });
});

app.post('/api/social/posts/:postId/comments', (req, res) => {
    const store = readSocialStore();
    const handle = normalizeSocialHandle(req.body && req.body.handle);
    const postId = sanitizeSocialText(req.params.postId, 80);
    const text = sanitizeSocialText(req.body && req.body.text, 180);
    const post = getAllSocialPosts(store).find(row => row.id === postId);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
    if (!text) return res.status(400).json({ success: false, error: 'Comment text is required' });
    ensureSocialAccount(store, handle, {});
    if (!Array.isArray(store.comments[postId])) store.comments[postId] = [];
    const comment = { id: 'cmt_' + crypto.randomBytes(6).toString('hex'), handle, text, createdAt: new Date().toISOString() };
    store.comments[postId].push(comment);
    store.comments[postId] = store.comments[postId].slice(-100);
    writeSocialStore(store);
    res.json({ success: true, comment, post: buildSocialPost(store, post, handle) });
});

app.post('/api/social/follow', (req, res) => {
    const store = readSocialStore();
    const follower = normalizeSocialHandle(req.body && req.body.follower);
    const following = normalizeSocialHandle(req.body && req.body.following);
    ensureSocialAccount(store, follower, {});
    ensureSocialAccount(store, following, {});
    const rows = new Set(listSocialUsers(store.follows[follower]));
    if (follower !== following) {
        if (rows.has(following)) rows.delete(following); else rows.add(following);
    }
    store.follows[follower] = Array.from(rows);
    writeSocialStore(store);
    res.json({ success: true, follower, following, active: rows.has(following), followingList: store.follows[follower] });
});

const omendaAiTopics = [
    {
        title: 'Omenda Pi Pays Global',
        keywords: ['omenda', 'pi pays', 'platform', 'dashboard', 'ecosystem', 'global', 'mainnet'],
        answer: 'Omenda Pi Pays Global combines Pi payments, Visual Pi Cards, marketplace shopping, City Rush transport, maps, social tools, contracts, and project pages into one Pi Browser app. Use the marketplace as the main dashboard, then open cards, contracts, rides, maps, or AI from there.',
        actions: ['Open the Marketplace dashboard', 'Register or view a Visual Pi Card', 'Use Contracts Hub for projects']
    },
    {
        title: 'Visual Pi Card',
        keywords: ['card', 'visa', 'mastercard', 'amex', 'gold', 'platinum', 'black', 'balance', 'wallet'],
        answer: 'Visual Pi Card stores the user card profile, card numbers, balance, and transaction history in the app. The marketplace can fund the selected card from Pi Wallet and then record the card purchase. Card pages show tier-specific services for Visa, Mastercard, AMEX, Gold, Platinum, and Black cards.',
        actions: ['Open Pi Card', 'Choose a card type', 'Use Pay with Card in Marketplace']
    },
    {
        title: 'Pi Browser Payments',
        keywords: ['pi browser', 'payment', 'pay', 'wallet', 'sandbox', 'mainnet', 'authentication', 'domain', 'validation'],
        answer: 'Pi Browser payments require the deployed production URL, domain validation, Pi SDK authentication, and backend payment approval/completion endpoints. The production domain is https://omendapipaysglobel.online and the validation key is available at /validation-key.txt.',
        actions: ['Open in Pi Browser', 'Confirm domain validation', 'Use deployed URL for real Pi auth']
    },
    {
        title: 'Contracts Hub',
        keywords: ['contract', 'contracts', 'project', 'house', 'building', 'road', 'industry', 'mining', 'tourism'],
        answer: 'Contracts Hub organizes major project requests for house building, road works, industry projects, mining and minerals, and tourism. Each page has its own project details, request form, and marketplace workflow.',
        actions: ['Open Contracts Hub', 'Pick a project page', 'Save a request for review']
    },
    {
        title: 'Road Contracts',
        keywords: ['road', 'roads', 'drainage', 'bridge', 'culvert', 'paving', 'maintenance', 'signage'],
        answer: 'Road contracts cover surveys, access routes, municipal roads, drainage, bridges, haul roads, paving, lighting, signage, and maintenance. The road page includes six project cards and four delivery package cards.',
        actions: ['Request road works', 'Describe road length and surface', 'Add drainage and bridge needs']
    },
    {
        title: 'Mining and Minerals',
        keywords: ['mining', 'minerals', 'gold', 'copper', 'cobalt', 'gemstone', 'machinery', 'quarry'],
        answer: 'Mining and minerals contracts cover exploration, site access, machinery, extraction, safety, processing, storage, transport, offtake, mineral supply desks, and mining shops for verified materials and services.',
        actions: ['Request mining contract', 'List mineral type and site', 'Add machinery and buyer needs']
    },
    {
        title: 'Tourism Projects',
        keywords: ['tourism', 'tourist', 'tanzania', 'zanzibar', 'hotel', 'safari', 'fish', 'mountain', 'kilimanjaro'],
        answer: 'Tourism projects cover Tanzania and Zanzibar destinations, hotels, guides, safari wildlife, reef fish and ocean tours, Mount Kilimanjaro, Mount Meru, destination marketing, transport, and booking partners.',
        actions: ['Request tourism project', 'Choose destination', 'Add hotel, guide, and transport details']
    },
    {
        title: 'City Rush',
        keywords: ['ride', 'city rush', 'transport', 'delivery', 'airport', 'route', 'driver'],
        answer: 'City Rush is the ride, delivery, airport transfer, and route-planning page. It supports Pi Wallet and card payment UI, fare previews, service selection, and map routing.',
        actions: ['Open City Rush', 'Select route and service', 'Connect Pi or pay with card']
    },
    {
        title: 'Development and Production',
        keywords: ['development', 'production', 'url', 'deploy', 'live', 'server', 'github', 'pm2'],
        answer: 'Development runs locally at http://127.0.0.1:3000/visual%20pi%20card/shop.html. Production runs at https://omendapipaysglobel.online. The live server uses nginx with /var/www/pivisualcard and PM2 process pivisualcard.',
        actions: ['Test locally', 'Push to GitHub main', 'Deploy to /var/www/pivisualcard and restart PM2']
    }
];

function normalizeAiText(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function scoreOmendaTopic(topic, normalizedMessage) {
    const score = topic.keywords.reduce((total, keyword) => {
        return total + (normalizedMessage.includes(keyword) ? keyword.split(' ').length : 0);
    }, 0);
    const broadTopics = ['Omenda Pi Pays Global', 'Contracts Hub'];
    return score > 1 && !broadTopics.includes(topic.title) ? score + 0.5 : score;
}

function buildOmendaAiReply(message, history) {
    const normalized = normalizeAiText(message);
    const scored = omendaAiTopics
        .map(topic => ({ topic, score: scoreOmendaTopic(topic, normalized) }))
        .filter(row => row.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

    const selected = scored.length ? scored.map(row => row.topic) : [omendaAiTopics[0], omendaAiTopics[3], omendaAiTopics[2]];
    const primary = selected[0];
    const contextCount = Array.isArray(history) ? Math.min(history.length, 8) : 0;
    const related = selected.slice(1).map(topic => topic.title).join(', ');
    const actions = primary.actions.map(action => '- ' + action).join('\n');

    let reply = primary.answer;
    if (related) reply += '\n\nRelated areas: ' + related + '.';
    reply += '\n\nSuggested next steps:\n' + actions;
    if (contextCount) reply += '\n\nI used the last ' + contextCount + ' message(s) in this chat as context.';

    return {
        reply,
        sources: selected.map(topic => topic.title),
        suggestions: [
            'Create a project request',
            'Explain Pi payment setup',
            'Show production URL',
            'Help write marketplace product text'
        ]
    };
}

app.post('/api/omenda-ai/chat', (req, res) => {
    const message = String((req.body && req.body.message) || '').trim();
    const history = Array.isArray(req.body && req.body.history) ? req.body.history.slice(-8) : [];

    if (!message) {
        return res.status(400).json({ success: false, error: 'Message is required' });
    }

    if (message.length > 2000) {
        return res.status(400).json({ success: false, error: 'Message is too long' });
    }

    const result = buildOmendaAiReply(message, history);
    res.json({
        success: true,
        mode: 'local-omenda-ai',
        createdAt: new Date().toISOString(),
        reply: result.reply,
        sources: result.sources,
        suggestions: result.suggestions
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
