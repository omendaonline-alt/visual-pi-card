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
    if (decoded.startsWith('/visual pi card/')) {
        const target = decoded.replace('/visual pi card/', '/');
        return res.redirect(301, target);
    }
    if (req.path.startsWith('/visual%20pi%20card/')) {
        const decodedPath = decodeURIComponent(req.path);
        const target = decodedPath.replace('/visual pi card/', '/');
        return res.redirect(301, target);
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
        balance: 100,
        giftBalance: 0,
        piAddress: 'GCDXL7HQ4GKMV5YA3BQPZ4PIPIONEER',
        cardType: 'visa',
        transactions: []
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

// --------------- Social feed API (backend functions) ---------------
const socialPosts = [
    {
        id: 'post_001',
        user: '@OmendaOfficial',
        name: 'Omenda Official',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop',
        image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=1200&auto=format&fit=crop',
        caption: 'Our latest Pi-powered storefront feature is now live. Discover how creators can tag products inside posts and let customers checkout directly from the feed.',
        label: 'Shop-ready social commerce',
        postedAt: '2h ago',
        reactions: { like: 1200, fire: 320, laugh: 84, clap: 46 },
        gifts: { gift: 12, rocket: 3, diamond: 1 }
    },
    {
        id: 'post_002',
        user: '@PiTravel',
        name: 'Pi Travel',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop',
        image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop',
        caption: 'Travel with Pi and capture moments from trusted local guides, sellers, and Portals.',
        label: 'Travel stories',
        postedAt: '5h ago',
        reactions: { like: 980, wave: 160, comment: 52 },
        gifts: { gift: 8, rocket: 2, diamond: 0 }
    },
    {
        id: 'post_003',
        user: '@MarketPulse',
        name: 'Market Pulse',
        avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=400&auto=format&fit=crop',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1200&auto=format&fit=crop',
        caption: 'Browse trusted Pi vendors, product stories, and marketplace highlights in one social feed. From fashion to gadgets, every discovery is connected with Pi commerce.',
        label: 'Marketplace pulse',
        postedAt: '1d ago',
        reactions: { like: 1500, shop: 210, fire: 79 },
        gifts: { gift: 18, rocket: 5, diamond: 2 }
    }
];

const marketplaceProducts = [
    { id: 'e1', title: '17 PRO MAX Smartphone', price: 'π0.003', image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=400&auto=format&fit=crop', category: 'Electronics', brand: 'TechVista', tag: 'Most Popular' },
    { id: 'f2', title: 'Running Sneakers Air Max', price: 'π0.0004', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400&auto=format&fit=crop', category: 'Fashion', brand: 'StepKing', tag: 'Hot Trend' },
    { id: 'hg4', title: 'LED Desk Lamp Touch Dimmable', price: 'π0.0001', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?q=80&w=400&auto=format&fit=crop', category: 'Home & Garden', brand: 'LightWave', tag: 'New Arrival' },
    { id: 'c6', title: 'Tesla Model Y Long Range 2024', price: 'π0.13', image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?q=80&w=400&auto=format&fit=crop', category: 'Cars', brand: 'Tesla Inc', tag: 'Hot Deal' },
    { id: 're1', title: 'Modern 3BR Apartment Downtown', price: 'π5.0', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=400&auto=format&fit=crop', category: 'Real Estate', brand: 'Prime Realty', tag: 'Featured' }
];

const productStats = {
    e1: { reactions: { like: 320, fire: 120, shop: 45 }, gifts: { gift: 10, rocket: 2 } },
    f2: { reactions: { like: 210, fire: 68 }, gifts: { gift: 5 } },
    hg4: { reactions: { like: 94 }, gifts: { gift: 2 } },
    c6: { reactions: { like: 40 }, gifts: { rocket: 1, diamond: 1 } },
    re1: { reactions: { like: 25, shop: 12 }, gifts: { gift: 1 } }
};

function getProductById(productId) {
    return marketplaceProducts.find(product => product.id === productId) || null;
}

function getProductStats(productId) {
    if (!productStats[productId]) {
        productStats[productId] = { reactions: {}, gifts: {} };
    }
    return productStats[productId];
}

function addProductReaction(productId, reactionType) {
    const product = getProductById(productId);
    if (!product || !reactionType) return null;

    const normalized = String(reactionType).toLowerCase();
    if (!normalized) return null;

    const stats = getProductStats(productId);
    if (!stats.reactions[normalized]) {
        stats.reactions[normalized] = 0;
    }
    stats.reactions[normalized] += 1;
    return stats;
}

function addProductGift(productId, giftType) {
    const user = users[CURRENT_USER];
    const product = getProductById(productId);
    const gift = giftCatalog[giftType];

    if (!user || !product || !gift) return { error: 'Invalid gift or product.' };
    if (user.balance < gift.cost) return { error: 'Insufficient Pi balance.' };

    user.balance -= gift.cost;
    const stats = getProductStats(productId);
    if (!stats.gifts[giftType]) {
        stats.gifts[giftType] = 0;
    }
    stats.gifts[giftType] += 1;

    const tx = {
        id: generateTxId(),
        type: 'gift',
        name: `${gift.label} to product ${productId}`,
        amount: -gift.cost,
        date: formatDate(new Date()),
        status: 'completed'
    };
    user.transactions.unshift(tx);

    return { product: stats, balance: user.balance, giftBalance: user.giftBalance || 0 };
}

const giftCatalog = {
    gift: { cost: 1, label: 'Pi Gift', emoji: '🎁' },
    rocket: { cost: 5, label: 'Pi Rocket', emoji: '🚀' },
    diamond: { cost: 10, label: 'Pi Diamond', emoji: '💎' },
    gvc: { cost: 314159, label: 'GVC Follow', emoji: '🪙' }
};

const emojiSupply = [
    { id: 'smile', emoji: '😀', label: 'Happy Smile', category: 'Emoji', cost: 0.0000001, description: 'Tiny Pi sticker that spreads joy.' },
    { id: 'spark', emoji: '✨', label: 'Sparkle', category: 'Emoji', cost: 0.000002, description: 'Add a little shine to a post.' },
    { id: 'fire', emoji: '🔥', label: 'Fire', category: 'Emoji', cost: 0.00001, description: 'Send a hot reaction with minimal Pi.' },
    { id: 'heart', emoji: '❤️', label: 'Heart', category: 'Emoji', cost: 0.00005, description: 'A small love gift with Pi value.' },
    { id: 'rocket', emoji: '🚀', label: 'Rocket Boost', category: 'Emoji', cost: 0.0002, description: 'Launch your support with a lightweight gift.' },
    { id: 'thumbs', emoji: '👍', label: 'Thumbs Up', category: 'Emoji', cost: 0.001, description: 'A friendly support badge.' },
    { id: 'tada', emoji: '🎉', label: 'Celebration', category: 'Emoji', cost: 0.01, description: 'A bigger Pi celebration gift.' },
    { id: 'eyes', emoji: '👀', label: 'Eyes', category: 'Emoji', cost: 0.05, description: 'A strong attention gift.' },
    { id: 'diamond', emoji: '💎', label: 'Diamond', category: 'Emoji', cost: 0.1, description: 'Premium sparkle with Pi.' },
    { id: 'star', emoji: '🌟', label: 'Star Power', category: 'Emoji', cost: 0.008, description: 'A bright Pi boost.' },
    { id: 'wave', emoji: '👋', label: 'Wave', category: 'Emoji', cost: 0.0003, description: 'Say hi with Pi support.' },
    { id: 'kiss', emoji: '😘', label: 'Kiss', category: 'Emoji', cost: 0.0002, description: 'Send warm appreciation.' },
    { id: 'clap', emoji: '👏', label: 'Applause', category: 'Emoji', cost: 0.002, description: 'Celebrate a post with claps.' },
    { id: 'joy', emoji: '😄', label: 'Joy', category: 'Emoji', cost: 0.0000001, description: 'A bright joyful reaction.' },
    { id: 'blush', emoji: '😊', label: 'Blush', category: 'Emoji', cost: 0.0000002, description: 'Gentle positive support.' },
    { id: 'love', emoji: '😍', label: 'Love Eyes', category: 'Emoji', cost: 0.0000005, description: 'Show extra love and excitement.' },
    { id: 'party', emoji: '🥳', label: 'Party', category: 'Emoji', cost: 0.000005, description: 'Celebrate with a fun party reaction.' },
    { id: 'cool', emoji: '😎', label: 'Cool Shades', category: 'Emoji', cost: 0.00001, description: 'A smooth support badge.' },
    { id: 'heartSparkle', emoji: '💖', label: 'Heart Sparkle', category: 'Emoji', cost: 0.00003, description: 'Send a shiny heart.' },
    { id: 'gift', emoji: '🎁', label: 'Gift', category: 'Emoji', cost: 0.0005, description: 'Packaged support gift.' },
    { id: 'sun', emoji: '☀️', label: 'Sun', category: 'Emoji', cost: 0.00006, description: 'Brighten a post with sunshine.' },
    { id: 'moon', emoji: '🌙', label: 'Moon', category: 'Emoji', cost: 0.00006, description: 'Send peaceful night vibes.' },
    { id: 'pizza', emoji: '🍕', label: 'Pizza', category: 'Emoji', cost: 0.00009, description: 'Share a tasty Pi snack.' },
    { id: 'coffee', emoji: '☕', label: 'Coffee', category: 'Emoji', cost: 0.00012, description: 'Fuel the feed with coffee energy.' }
];

const countryFlagSupply = [
{ id: 'flag_af', emoji: '🇦🇫', label: 'Afghanistan Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Afghanistan' },
  { id: 'flag_ax', emoji: '🇦🇽', label: 'Åland Islands Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Åland Islands' },
  { id: 'flag_al', emoji: '🇦🇱', label: 'Albania Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Albania' },
  { id: 'flag_dz', emoji: '🇩🇿', label: 'Algeria Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Algeria' },
  { id: 'flag_as', emoji: '🇦🇸', label: 'American Samoa Flag', category: 'Country Flag', cost: 1, description: 'Country flag for American Samoa' },
  { id: 'flag_ad', emoji: '🇦🇩', label: 'Andorra Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Andorra' },
  { id: 'flag_ao', emoji: '🇦🇴', label: 'Angola Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Angola' },
  { id: 'flag_ai', emoji: '🇦🇮', label: 'Anguilla Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Anguilla' },
  { id: 'flag_aq', emoji: '🇦🇶', label: 'Antarctica Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Antarctica' },
  { id: 'flag_ag', emoji: '🇦🇬', label: 'Antigua & Barbuda Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Antigua & Barbuda' },
  { id: 'flag_ar', emoji: '🇦🇷', label: 'Argentina Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Argentina' },
  { id: 'flag_am', emoji: '🇦🇲', label: 'Armenia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Armenia' },
  { id: 'flag_aw', emoji: '🇦🇼', label: 'Aruba Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Aruba' },
  { id: 'flag_au', emoji: '🇦🇺', label: 'Australia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Australia' },
  { id: 'flag_at', emoji: '🇦🇹', label: 'Austria Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Austria' },
  { id: 'flag_az', emoji: '🇦🇿', label: 'Azerbaijan Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Azerbaijan' },
  { id: 'flag_bs', emoji: '🇧🇸', label: 'Bahamas Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Bahamas' },
  { id: 'flag_bh', emoji: '🇧🇭', label: 'Bahrain Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Bahrain' },
  { id: 'flag_bd', emoji: '🇧🇩', label: 'Bangladesh Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Bangladesh' },
  { id: 'flag_bb', emoji: '🇧🇧', label: 'Barbados Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Barbados' },
  { id: 'flag_by', emoji: '🇧🇾', label: 'Belarus Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Belarus' },
  { id: 'flag_be', emoji: '🇧🇪', label: 'Belgium Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Belgium' },
  { id: 'flag_bz', emoji: '🇧🇿', label: 'Belize Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Belize' },
  { id: 'flag_bj', emoji: '🇧🇯', label: 'Benin Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Benin' },
  { id: 'flag_bm', emoji: '🇧🇲', label: 'Bermuda Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Bermuda' },
  { id: 'flag_bt', emoji: '🇧🇹', label: 'Bhutan Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Bhutan' },
  { id: 'flag_bo', emoji: '🇧🇴', label: 'Bolivia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Bolivia' },
  { id: 'flag_bq', emoji: '🇧🇶', label: 'Caribbean Netherlands Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Caribbean Netherlands' },
  { id: 'flag_ba', emoji: '🇧🇦', label: 'Bosnia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Bosnia' },
  { id: 'flag_bw', emoji: '🇧🇼', label: 'Botswana Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Botswana' },
  { id: 'flag_bv', emoji: '🇧🇻', label: 'Bouvet Island Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Bouvet Island' },
  { id: 'flag_br', emoji: '🇧🇷', label: 'Brazil Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Brazil' },
  { id: 'flag_io', emoji: '🇮🇴', label: 'British Indian Ocean Territory Flag', category: 'Country Flag', cost: 1, description: 'Country flag for British Indian Ocean Territory' },
  { id: 'flag_vg', emoji: '🇻🇬', label: 'British Virgin Islands Flag', category: 'Country Flag', cost: 1, description: 'Country flag for British Virgin Islands' },
  { id: 'flag_bn', emoji: '🇧🇳', label: 'Brunei Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Brunei' },
  { id: 'flag_bg', emoji: '🇧🇬', label: 'Bulgaria Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Bulgaria' },
  { id: 'flag_bf', emoji: '🇧🇫', label: 'Burkina Faso Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Burkina Faso' },
  { id: 'flag_bi', emoji: '🇧🇮', label: 'Burundi Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Burundi' },
  { id: 'flag_cv', emoji: '🇨🇻', label: 'Cape Verde Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Cape Verde' },
  { id: 'flag_kh', emoji: '🇰🇭', label: 'Cambodia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Cambodia' },
  { id: 'flag_cm', emoji: '🇨🇲', label: 'Cameroon Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Cameroon' },
  { id: 'flag_ca', emoji: '🇨🇦', label: 'Canada Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Canada' },
  { id: 'flag_ky', emoji: '🇰🇾', label: 'Cayman Islands Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Cayman Islands' },
  { id: 'flag_cf', emoji: '🇨🇫', label: 'Central African Republic Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Central African Republic' },
  { id: 'flag_td', emoji: '🇹🇩', label: 'Chad Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Chad' },
  { id: 'flag_cl', emoji: '🇨🇱', label: 'Chile Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Chile' },
  { id: 'flag_cn', emoji: '🇨🇳', label: 'China Flag', category: 'Country Flag', cost: 1, description: 'Country flag for China' },
  { id: 'flag_hk', emoji: '🇭🇰', label: 'Hong Kong Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Hong Kong' },
  { id: 'flag_mo', emoji: '🇲🇴', label: 'Macao Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Macao' },
  { id: 'flag_cx', emoji: '🇨🇽', label: 'Christmas Island Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Christmas Island' },
  { id: 'flag_cc', emoji: '🇨🇨', label: 'Cocos Islands Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Cocos Islands' },
  { id: 'flag_co', emoji: '🇨🇴', label: 'Colombia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Colombia' },
  { id: 'flag_km', emoji: '🇰🇲', label: 'Comoros Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Comoros' },
  { id: 'flag_cg', emoji: '🇨🇬', label: 'Congo - Brazzaville Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Congo - Brazzaville' },
  { id: 'flag_ck', emoji: '🇨🇰', label: 'Cook Islands Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Cook Islands' },
  { id: 'flag_cr', emoji: '🇨🇷', label: 'Costa Rica Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Costa Rica' },
  { id: 'flag_hr', emoji: '🇭🇷', label: 'Croatia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Croatia' },
  { id: 'flag_cu', emoji: '🇨🇺', label: 'Cuba Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Cuba' },
  { id: 'flag_cw', emoji: '🇨🇼', label: 'Curaçao Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Curaçao' },
  { id: 'flag_cy', emoji: '🇨🇾', label: 'Cyprus Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Cyprus' },
  { id: 'flag_cz', emoji: '🇨🇿', label: 'Czechia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Czechia' },
  { id: 'flag_kp', emoji: '🇰🇵', label: 'North Korea Flag', category: 'Country Flag', cost: 1, description: 'Country flag for North Korea' },
  { id: 'flag_cd', emoji: '🇨🇩', label: 'Congo - Kinshasa Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Congo - Kinshasa' },
  { id: 'flag_dk', emoji: '🇩🇰', label: 'Denmark Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Denmark' },
  { id: 'flag_dj', emoji: '🇩🇯', label: 'Djibouti Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Djibouti' },
  { id: 'flag_dm', emoji: '🇩🇲', label: 'Dominica Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Dominica' },
  { id: 'flag_do', emoji: '🇩🇴', label: 'Dominican Republic Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Dominican Republic' },
  { id: 'flag_ec', emoji: '🇪🇨', label: 'Ecuador Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Ecuador' },
  { id: 'flag_eg', emoji: '🇪🇬', label: 'Egypt Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Egypt' },
  { id: 'flag_sv', emoji: '🇸🇻', label: 'El Salvador Flag', category: 'Country Flag', cost: 1, description: 'Country flag for El Salvador' },
  { id: 'flag_gq', emoji: '🇬🇶', label: 'Equatorial Guinea Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Equatorial Guinea' },
  { id: 'flag_er', emoji: '🇪🇷', label: 'Eritrea Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Eritrea' },
  { id: 'flag_ee', emoji: '🇪🇪', label: 'Estonia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Estonia' },
  { id: 'flag_sz', emoji: '🇸🇿', label: 'Eswatini Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Eswatini' },
  { id: 'flag_et', emoji: '🇪🇹', label: 'Ethiopia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Ethiopia' },
  { id: 'flag_fk', emoji: '🇫🇰', label: 'Falkland Islands Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Falkland Islands' },
  { id: 'flag_fo', emoji: '🇫🇴', label: 'Faroe Islands Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Faroe Islands' },
  { id: 'flag_fj', emoji: '🇫🇯', label: 'Fiji Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Fiji' },
  { id: 'flag_fi', emoji: '🇫🇮', label: 'Finland Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Finland' },
  { id: 'flag_fr', emoji: '🇫🇷', label: 'France Flag', category: 'Country Flag', cost: 1, description: 'Country flag for France' },
  { id: 'flag_gf', emoji: '🇬🇫', label: 'French Guiana Flag', category: 'Country Flag', cost: 1, description: 'Country flag for French Guiana' },
  { id: 'flag_pf', emoji: '🇵🇫', label: 'French Polynesia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for French Polynesia' },
  { id: 'flag_tf', emoji: '🇹🇫', label: 'French Southern Territories Flag', category: 'Country Flag', cost: 1, description: 'Country flag for French Southern Territories' },
  { id: 'flag_ga', emoji: '🇬🇦', label: 'Gabon Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Gabon' },
  { id: 'flag_gm', emoji: '🇬🇲', label: 'Gambia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Gambia' },
  { id: 'flag_ge', emoji: '🇬🇪', label: 'Georgia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Georgia' },
  { id: 'flag_de', emoji: '🇩🇪', label: 'Germany Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Germany' },
  { id: 'flag_gh', emoji: '🇬🇭', label: 'Ghana Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Ghana' },
  { id: 'flag_gi', emoji: '🇬🇮', label: 'Gibraltar Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Gibraltar' },
  { id: 'flag_gr', emoji: '🇬🇷', label: 'Greece Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Greece' },
  { id: 'flag_gl', emoji: '🇬🇱', label: 'Greenland Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Greenland' },
  { id: 'flag_gd', emoji: '🇬🇩', label: 'Grenada Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Grenada' },
  { id: 'flag_gp', emoji: '🇬🇵', label: 'Guadeloupe Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Guadeloupe' },
  { id: 'flag_gu', emoji: '🇬🇺', label: 'Guam Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Guam' },
  { id: 'flag_gt', emoji: '🇬🇹', label: 'Guatemala Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Guatemala' },
  { id: 'flag_gg', emoji: '🇬🇬', label: 'Guernsey Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Guernsey' },
  { id: 'flag_gn', emoji: '🇬🇳', label: 'Guinea Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Guinea' },
  { id: 'flag_gw', emoji: '🇬🇼', label: 'Guinea-Bissau Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Guinea-Bissau' },
  { id: 'flag_gy', emoji: '🇬🇾', label: 'Guyana Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Guyana' },
  { id: 'flag_ht', emoji: '🇭🇹', label: 'Haiti Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Haiti' },
  { id: 'flag_hm', emoji: '🇭🇲', label: 'Heard & McDonald Islands Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Heard & McDonald Islands' },
  { id: 'flag_va', emoji: '🇻🇦', label: 'Vatican City Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Vatican City' },
  { id: 'flag_hn', emoji: '🇭🇳', label: 'Honduras Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Honduras' },
  { id: 'flag_hu', emoji: '🇭🇺', label: 'Hungary Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Hungary' },
  { id: 'flag_is', emoji: '🇮🇸', label: 'Iceland Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Iceland' },
  { id: 'flag_in', emoji: '🇮🇳', label: 'India Flag', category: 'Country Flag', cost: 1, description: 'Country flag for India' },
  { id: 'flag_id', emoji: '🇮🇩', label: 'Indonesia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Indonesia' },
  { id: 'flag_ir', emoji: '🇮🇷', label: 'Iran Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Iran' },
  { id: 'flag_iq', emoji: '🇮🇶', label: 'Iraq Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Iraq' },
  { id: 'flag_ie', emoji: '🇮🇪', label: 'Ireland Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Ireland' },
  { id: 'flag_im', emoji: '🇮🇲', label: 'Isle of Man Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Isle of Man' },
  { id: 'flag_il', emoji: '🇮🇱', label: 'Israel Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Israel' },
  { id: 'flag_it', emoji: '🇮🇹', label: 'Italy Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Italy' },
  { id: 'flag_ci', emoji: '🇨🇮', label: 'Côte d’Ivoire Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Côte d’Ivoire' },
  { id: 'flag_jm', emoji: '🇯🇲', label: 'Jamaica Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Jamaica' },
  { id: 'flag_jp', emoji: '🇯🇵', label: 'Japan Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Japan' },
  { id: 'flag_je', emoji: '🇯🇪', label: 'Jersey Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Jersey' },
  { id: 'flag_jo', emoji: '🇯🇴', label: 'Jordan Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Jordan' },
  { id: 'flag_kz', emoji: '🇰🇿', label: 'Kazakhstan Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Kazakhstan' },
  { id: 'flag_ke', emoji: '🇰🇪', label: 'Kenya Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Kenya' },
  { id: 'flag_ki', emoji: '🇰🇮', label: 'Kiribati Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Kiribati' },
  { id: 'flag_kw', emoji: '🇰🇼', label: 'Kuwait Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Kuwait' },
  { id: 'flag_kg', emoji: '🇰🇬', label: 'Kyrgyzstan Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Kyrgyzstan' },
  { id: 'flag_la', emoji: '🇱🇦', label: 'Laos Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Laos' },
  { id: 'flag_lv', emoji: '🇱🇻', label: 'Latvia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Latvia' },
  { id: 'flag_lb', emoji: '🇱🇧', label: 'Lebanon Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Lebanon' },
  { id: 'flag_ls', emoji: '🇱🇸', label: 'Lesotho Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Lesotho' },
  { id: 'flag_lr', emoji: '🇱🇷', label: 'Liberia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Liberia' },
  { id: 'flag_ly', emoji: '🇱🇾', label: 'Libya Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Libya' },
  { id: 'flag_li', emoji: '🇱🇮', label: 'Liechtenstein Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Liechtenstein' },
  { id: 'flag_lt', emoji: '🇱🇹', label: 'Lithuania Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Lithuania' },
  { id: 'flag_lu', emoji: '🇱🇺', label: 'Luxembourg Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Luxembourg' },
  { id: 'flag_mg', emoji: '🇲🇬', label: 'Madagascar Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Madagascar' },
  { id: 'flag_mw', emoji: '🇲🇼', label: 'Malawi Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Malawi' },
  { id: 'flag_my', emoji: '🇲🇾', label: 'Malaysia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Malaysia' },
  { id: 'flag_mv', emoji: '🇲🇻', label: 'Maldives Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Maldives' },
  { id: 'flag_ml', emoji: '🇲🇱', label: 'Mali Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Mali' },
  { id: 'flag_mt', emoji: '🇲🇹', label: 'Malta Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Malta' },
  { id: 'flag_mh', emoji: '🇲🇭', label: 'Marshall Islands Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Marshall Islands' },
  { id: 'flag_mq', emoji: '🇲🇶', label: 'Martinique Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Martinique' },
  { id: 'flag_mr', emoji: '🇲🇷', label: 'Mauritania Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Mauritania' },
  { id: 'flag_mu', emoji: '🇲🇺', label: 'Mauritius Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Mauritius' },
  { id: 'flag_yt', emoji: '🇾🇹', label: 'Mayotte Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Mayotte' },
  { id: 'flag_mx', emoji: '🇲🇽', label: 'Mexico Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Mexico' },
  { id: 'flag_fm', emoji: '🇫🇲', label: 'Micronesia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Micronesia' },
  { id: 'flag_mc', emoji: '🇲🇨', label: 'Monaco Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Monaco' },
  { id: 'flag_mn', emoji: '🇲🇳', label: 'Mongolia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Mongolia' },
  { id: 'flag_me', emoji: '🇲🇪', label: 'Montenegro Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Montenegro' },
  { id: 'flag_ms', emoji: '🇲🇸', label: 'Montserrat Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Montserrat' },
  { id: 'flag_ma', emoji: '🇲🇦', label: 'Morocco Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Morocco' },
  { id: 'flag_mz', emoji: '🇲🇿', label: 'Mozambique Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Mozambique' },
  { id: 'flag_mm', emoji: '🇲🇲', label: 'Myanmar Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Myanmar' },
  { id: 'flag_na', emoji: '🇳🇦', label: 'Namibia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Namibia' },
  { id: 'flag_nr', emoji: '🇳🇷', label: 'Nauru Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Nauru' },
  { id: 'flag_np', emoji: '🇳🇵', label: 'Nepal Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Nepal' },
  { id: 'flag_nl', emoji: '🇳🇱', label: 'Netherlands Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Netherlands' },
  { id: 'flag_nc', emoji: '🇳🇨', label: 'New Caledonia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for New Caledonia' },
  { id: 'flag_nz', emoji: '🇳🇿', label: 'New Zealand Flag', category: 'Country Flag', cost: 1, description: 'Country flag for New Zealand' },
  { id: 'flag_ni', emoji: '🇳🇮', label: 'Nicaragua Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Nicaragua' },
  { id: 'flag_ne', emoji: '🇳🇪', label: 'Niger Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Niger' },
  { id: 'flag_ng', emoji: '🇳🇬', label: 'Nigeria Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Nigeria' },
  { id: 'flag_nu', emoji: '🇳🇺', label: 'Niue Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Niue' },
  { id: 'flag_nf', emoji: '🇳🇫', label: 'Norfolk Island Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Norfolk Island' },
  { id: 'flag_mp', emoji: '🇲🇵', label: 'Northern Mariana Islands Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Northern Mariana Islands' },
  { id: 'flag_mk', emoji: '🇲🇰', label: 'North Macedonia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for North Macedonia' },
  { id: 'flag_no', emoji: '🇳🇴', label: 'Norway Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Norway' },
  { id: 'flag_om', emoji: '🇴🇲', label: 'Oman Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Oman' },
  { id: 'flag_pk', emoji: '🇵🇰', label: 'Pakistan Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Pakistan' },
  { id: 'flag_pw', emoji: '🇵🇼', label: 'Palau Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Palau' },
  { id: 'flag_pa', emoji: '🇵🇦', label: 'Panama Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Panama' },
  { id: 'flag_pg', emoji: '🇵🇬', label: 'Papua New Guinea Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Papua New Guinea' },
  { id: 'flag_py', emoji: '🇵🇾', label: 'Paraguay Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Paraguay' },
  { id: 'flag_pe', emoji: '🇵🇪', label: 'Peru Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Peru' },
  { id: 'flag_ph', emoji: '🇵🇭', label: 'Philippines Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Philippines' },
  { id: 'flag_pn', emoji: '🇵🇳', label: 'Pitcairn Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Pitcairn' },
  { id: 'flag_pl', emoji: '🇵🇱', label: 'Poland Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Poland' },
  { id: 'flag_pt', emoji: '🇵🇹', label: 'Portugal Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Portugal' },
  { id: 'flag_pr', emoji: '🇵🇷', label: 'Puerto Rico Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Puerto Rico' },
  { id: 'flag_qa', emoji: '🇶🇦', label: 'Qatar Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Qatar' },
  { id: 'flag_kr', emoji: '🇰🇷', label: 'South Korea Flag', category: 'Country Flag', cost: 1, description: 'Country flag for South Korea' },
  { id: 'flag_md', emoji: '🇲🇩', label: 'Moldova Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Moldova' },
  { id: 'flag_re', emoji: '🇷🇪', label: 'Réunion Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Réunion' },
  { id: 'flag_ro', emoji: '🇷🇴', label: 'Romania Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Romania' },
  { id: 'flag_ru', emoji: '🇷🇺', label: 'Russia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Russia' },
  { id: 'flag_rw', emoji: '🇷🇼', label: 'Rwanda Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Rwanda' },
  { id: 'flag_bl', emoji: '🇧🇱', label: 'St. Barthélemy Flag', category: 'Country Flag', cost: 1, description: 'Country flag for St. Barthélemy' },
  { id: 'flag_sh', emoji: '🇸🇭', label: 'St. Helena Flag', category: 'Country Flag', cost: 1, description: 'Country flag for St. Helena' },
  { id: 'flag_kn', emoji: '🇰🇳', label: 'St. Kitts & Nevis Flag', category: 'Country Flag', cost: 1, description: 'Country flag for St. Kitts & Nevis' },
  { id: 'flag_lc', emoji: '🇱🇨', label: 'St. Lucia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for St. Lucia' },
  { id: 'flag_mf', emoji: '🇲🇫', label: 'St. Martin Flag', category: 'Country Flag', cost: 1, description: 'Country flag for St. Martin' },
  { id: 'flag_pm', emoji: '🇵🇲', label: 'St. Pierre & Miquelon Flag', category: 'Country Flag', cost: 1, description: 'Country flag for St. Pierre & Miquelon' },
  { id: 'flag_vc', emoji: '🇻🇨', label: 'St. Vincent & Grenadines Flag', category: 'Country Flag', cost: 1, description: 'Country flag for St. Vincent & Grenadines' },
  { id: 'flag_ws', emoji: '🇼🇸', label: 'Samoa Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Samoa' },
  { id: 'flag_sm', emoji: '🇸🇲', label: 'San Marino Flag', category: 'Country Flag', cost: 1, description: 'Country flag for San Marino' },
  { id: 'flag_st', emoji: '🇸🇹', label: 'São Tomé & Príncipe Flag', category: 'Country Flag', cost: 1, description: 'Country flag for São Tomé & Príncipe' },
  { id: 'flag_sa', emoji: '🇸🇦', label: 'Saudi Arabia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Saudi Arabia' },
  { id: 'flag_sn', emoji: '🇸🇳', label: 'Senegal Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Senegal' },
  { id: 'flag_rs', emoji: '🇷🇸', label: 'Serbia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Serbia' },
  { id: 'flag_sc', emoji: '🇸🇨', label: 'Seychelles Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Seychelles' },
  { id: 'flag_sl', emoji: '🇸🇱', label: 'Sierra Leone Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Sierra Leone' },
  { id: 'flag_sg', emoji: '🇸🇬', label: 'Singapore Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Singapore' },
  { id: 'flag_sx', emoji: '🇸🇽', label: 'Sint Maarten Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Sint Maarten' },
  { id: 'flag_sk', emoji: '🇸🇰', label: 'Slovakia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Slovakia' },
  { id: 'flag_si', emoji: '🇸🇮', label: 'Slovenia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Slovenia' },
  { id: 'flag_sb', emoji: '🇸🇧', label: 'Solomon Islands Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Solomon Islands' },
  { id: 'flag_so', emoji: '🇸🇴', label: 'Somalia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Somalia' },
  { id: 'flag_za', emoji: '🇿🇦', label: 'South Africa Flag', category: 'Country Flag', cost: 1, description: 'Country flag for South Africa' },
  { id: 'flag_gs', emoji: '🇬🇸', label: 'South Georgia & South Sandwich Islands Flag', category: 'Country Flag', cost: 1, description: 'Country flag for South Georgia & South Sandwich Islands' },
  { id: 'flag_ss', emoji: '🇸🇸', label: 'South Sudan Flag', category: 'Country Flag', cost: 1, description: 'Country flag for South Sudan' },
  { id: 'flag_es', emoji: '🇪🇸', label: 'Spain Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Spain' },
  { id: 'flag_lk', emoji: '🇱🇰', label: 'Sri Lanka Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Sri Lanka' },
  { id: 'flag_ps', emoji: '🇵🇸', label: 'Palestine Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Palestine' },
  { id: 'flag_sd', emoji: '🇸🇩', label: 'Sudan Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Sudan' },
  { id: 'flag_sr', emoji: '🇸🇷', label: 'Suriname Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Suriname' },
  { id: 'flag_sj', emoji: '🇸🇯', label: 'Svalbard & Jan Mayen Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Svalbard & Jan Mayen' },
  { id: 'flag_se', emoji: '🇸🇪', label: 'Sweden Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Sweden' },
  { id: 'flag_ch', emoji: '🇨🇭', label: 'Switzerland Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Switzerland' },
  { id: 'flag_sy', emoji: '🇸🇾', label: 'Syria Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Syria' },
  { id: 'flag_tw', emoji: '🇹🇼', label: 'Taiwan Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Taiwan' },
  { id: 'flag_tj', emoji: '🇹🇯', label: 'Tajikistan Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Tajikistan' },
  { id: 'flag_th', emoji: '🇹🇭', label: 'Thailand Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Thailand' },
  { id: 'flag_tl', emoji: '🇹🇱', label: 'Timor-Leste Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Timor-Leste' },
  { id: 'flag_tg', emoji: '🇹🇬', label: 'Togo Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Togo' },
  { id: 'flag_tk', emoji: '🇹🇰', label: 'Tokelau Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Tokelau' },
  { id: 'flag_to', emoji: '🇹🇴', label: 'Tonga Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Tonga' },
  { id: 'flag_tt', emoji: '🇹🇹', label: 'Trinidad & Tobago Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Trinidad & Tobago' },
  { id: 'flag_tn', emoji: '🇹🇳', label: 'Tunisia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Tunisia' },
  { id: 'flag_tr', emoji: '🇹🇷', label: 'Türkiye Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Türkiye' },
  { id: 'flag_tm', emoji: '🇹🇲', label: 'Turkmenistan Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Turkmenistan' },
  { id: 'flag_tc', emoji: '🇹🇨', label: 'Turks & Caicos Islands Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Turks & Caicos Islands' },
  { id: 'flag_tv', emoji: '🇹🇻', label: 'Tuvalu Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Tuvalu' },
  { id: 'flag_ug', emoji: '🇺🇬', label: 'Uganda Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Uganda' },
  { id: 'flag_ua', emoji: '🇺🇦', label: 'Ukraine Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Ukraine' },
  { id: 'flag_ae', emoji: '🇦🇪', label: 'United Arab Emirates Flag', category: 'Country Flag', cost: 1, description: 'Country flag for United Arab Emirates' },
  { id: 'flag_gb', emoji: '🇬🇧', label: 'UK Flag', category: 'Country Flag', cost: 1, description: 'Country flag for UK' },
  { id: 'flag_tz', emoji: '🇹🇿', label: 'Tanzania Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Tanzania' },
  { id: 'flag_um', emoji: '🇺🇲', label: 'U.S. Outlying Islands Flag', category: 'Country Flag', cost: 1, description: 'Country flag for U.S. Outlying Islands' },
  { id: 'flag_us', emoji: '🇺🇸', label: 'US Flag', category: 'Country Flag', cost: 1, description: 'Country flag for US' },
  { id: 'flag_vi', emoji: '🇻🇮', label: 'U.S. Virgin Islands Flag', category: 'Country Flag', cost: 1, description: 'Country flag for U.S. Virgin Islands' },
  { id: 'flag_uy', emoji: '🇺🇾', label: 'Uruguay Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Uruguay' },
  { id: 'flag_uz', emoji: '🇺🇿', label: 'Uzbekistan Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Uzbekistan' },
  { id: 'flag_vu', emoji: '🇻🇺', label: 'Vanuatu Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Vanuatu' },
  { id: 'flag_ve', emoji: '🇻🇪', label: 'Venezuela Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Venezuela' },
  { id: 'flag_vn', emoji: '🇻🇳', label: 'Vietnam Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Vietnam' },
  { id: 'flag_wf', emoji: '🇼🇫', label: 'Wallis & Futuna Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Wallis & Futuna' },
  { id: 'flag_eh', emoji: '🇪🇭', label: 'Western Sahara Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Western Sahara' },
  { id: 'flag_ye', emoji: '🇾🇪', label: 'Yemen Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Yemen' },
  { id: 'flag_zm', emoji: '🇿🇲', label: 'Zambia Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Zambia' },
  { id: 'flag_zw', emoji: '🇿🇼', label: 'Zimbabwe Flag', category: 'Country Flag', cost: 1, description: 'Country flag for Zimbabwe' }
];

function getSupplyItemById(itemId) {
    return [...emojiSupply, ...countryFlagSupply].find(item => item.id === itemId || item.emoji === itemId) || null;
}

function purchaseEmojiSupply(itemId, targetPostId) {
    const user = users[CURRENT_USER];
    const item = getSupplyItemById(itemId);
    if (!user || !item) return { error: 'Invalid emoji gift.' };
    if (user.balance < item.cost) return { error: 'Insufficient Pi balance.' };

    user.balance -= item.cost;
    const tx = {
        id: generateTxId(),
        type: 'emoji-gift',
        name: `Purchased ${item.label}`,
        amount: -item.cost,
        date: formatDate(new Date()),
        status: 'completed',
        metadata: { itemId, targetPostId: targetPostId || null }
    };
    user.transactions.unshift(tx);

    if (targetPostId) {
        const post = getPostById(targetPostId);
        if (post) {
            if (!post.gifts[itemId]) {
                post.gifts[itemId] = 0;
            }
            post.gifts[itemId] += 1;
        }
    }

    return { item, balance: user.balance, giftBalance: user.giftBalance || 0, transaction: tx };
}

function getPostById(postId) {
    return socialPosts.find(post => post.id === postId);
}

function addReaction(postId, reactionType) {
    const post = getPostById(postId);
    if (!post) return null;

    const normalized = String(reactionType || '').toLowerCase();
    if (!normalized) return null;

    if (!post.reactions[normalized]) {
        post.reactions[normalized] = 0;
    }
    post.reactions[normalized] += 1;
    return post;
}

function addGift(postId, giftType) {
    const user = users[CURRENT_USER];
    const post = getPostById(postId);
    const gift = giftCatalog[giftType];

    if (!user || !post || !gift) return { error: 'Invalid gift or post.' };
    if (user.balance < gift.cost) return { error: 'Insufficient Pi balance.' };

    user.balance -= gift.cost;
    if (!post.gifts[giftType]) {
        post.gifts[giftType] = 0;
    }
    post.gifts[giftType] += 1;

    const tx = {
        id: generateTxId(),
        type: 'gift',
        name: `${gift.label} to ${post.user}`,
        amount: -gift.cost,
        date: formatDate(new Date()),
        status: 'completed'
    };
    user.transactions.unshift(tx);

    return { post, balance: user.balance, giftBalance: user.giftBalance || 0 };
}

app.get('/api/feed', (req, res) => {
    res.json({ posts: socialPosts });
});

app.get('/api/user', (req, res) => {
    const user = users[CURRENT_USER];
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ id: user.id, username: user.username, name: user.name, balance: user.balance, giftBalance: user.giftBalance || 0 });
});

app.post('/api/feed/:id/reactions', (req, res) => {
    const postId = req.params.id;
    const { reaction } = req.body;

    if (!reaction) {
        return res.status(400).json({ error: 'Reaction type is required.' });
    }

    const updatedPost = addReaction(postId, reaction);
    if (!updatedPost) {
        return res.status(404).json({ error: 'Post not found or invalid reaction.' });
    }
    res.json(updatedPost);
});

app.post('/api/feed/:id/gift', (req, res) => {
    const postId = req.params.id;
    const { gift } = req.body;

    if (!gift) {
        return res.status(400).json({ error: 'Gift type is required.' });
    }

    const result = addGift(postId, gift);
    if (result.error) {
        const status = result.error === 'Insufficient Pi balance.' ? 402 : 400;
        return res.status(status).json({ error: result.error });
    }

    res.json(result);
});

app.get('/api/products', (req, res) => {
    const products = marketplaceProducts.map(product => {
        const stats = getProductStats(product.id);
        return {
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.image,
            category: product.category,
            brand: product.brand,
            tag: product.tag,
            reactions: stats.reactions,
            gifts: stats.gifts
        };
    });
    res.json({ products });
});

app.post('/api/products/:id/reactions', (req, res) => {
    const productId = req.params.id;
    const { reaction } = req.body;

    if (!reaction) {
        return res.status(400).json({ error: 'Reaction type is required.' });
    }

    const updatedStats = addProductReaction(productId, reaction);
    if (!updatedStats) {
        return res.status(404).json({ error: 'Product not found or invalid reaction.' });
    }

    res.json({ id: productId, reactions: updatedStats.reactions, gifts: updatedStats.gifts });
});

app.post('/api/products/:id/gift', (req, res) => {
    const productId = req.params.id;
    const { gift } = req.body;

    if (!gift) {
        return res.status(400).json({ error: 'Gift type is required.' });
    }

    const result = addProductGift(productId, gift);
    if (result.error) {
        const status = result.error === 'Insufficient Pi balance.' ? 402 : 400;
        return res.status(status).json({ error: result.error });
    }

    res.json(result);
});

app.get('/api/emoji-supply', (req, res) => {
    res.json({ items: [...emojiSupply, ...countryFlagSupply] });
});

app.post('/api/emoji-supply/:id/purchase', (req, res) => {
    const itemId = req.params.id;
    const { targetPostId } = req.body || {};

    if (!itemId) {
        return res.status(400).json({ error: 'Emoji gift ID is required.' });
    }

    const result = purchaseEmojiSupply(itemId, targetPostId);
    if (result.error) {
        const status = result.error === 'Insufficient Pi balance.' ? 402 : 400;
        return res.status(status).json({ error: result.error });
    }

    res.json(result);
});

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
        giftBalance: user.giftBalance || 0,
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

/** Adjust wallet balance & record a transaction (used by emoji marketplace) */
app.post('/api/wallet/adjust', (req, res) => {
    const user = users[CURRENT_USER];
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { amount, type, name } = req.body || {};
    const parsed = parseFloat(amount);
    if (!Number.isFinite(parsed)) return res.status(400).json({ error: 'Invalid amount' });
    const newBalance = user.balance + parsed;
    if (newBalance < 0) return res.status(400).json({ error: 'Insufficient balance', balance: user.balance });
    user.balance = newBalance;
    const tx = {
        id: generateTxId(),
        type: type || (parsed >= 0 ? 'recv' : 'sent'),
        name: name || 'Emoji marketplace',
        amount: parsed,
        date: new Date().toISOString(),
        status: 'completed'
    };
    user.transactions.unshift(tx);
    res.json({ success: true, balance: user.balance, transaction: tx });
});

/** Emoji gift inbox (shared across users for the demo) */
const emojiGifts = [];

app.get('/api/emoji/gifts', (req, res) => {
    const { postId, recipient, limit } = req.query;
    let list = emojiGifts;
    if (postId) list = list.filter(g => (g.postId || '') === String(postId));
    if (recipient) list = list.filter(g => g.recipient === String(recipient).replace(/^@/, ''));
    const n = Math.min(parseInt(limit, 10) || 50, 200);
    res.json({ success: true, gifts: list.slice(0, n) });
});

app.post('/api/emoji/gifts', (req, res) => {
    const { emoji, label, id, recipient, postId, value } = req.body || {};
    if (!emoji || !recipient) return res.status(400).json({ error: 'emoji and recipient required' });
    const v = parseFloat(value);
    const gift = {
        giftId: generateTxId(),
        id: String(id || '').slice(0, 64),
        emoji: String(emoji).slice(0, 16),
        label: String(label || '').slice(0, 80),
        recipient: String(recipient).replace(/^@/, '').slice(0, 64),
        postId: String(postId || '').slice(0, 64),
        value: Number.isFinite(v) ? v : 0,
        sender: users[CURRENT_USER]?.username || 'anonymous',
        ts: Date.now()
    };
    emojiGifts.unshift(gift);
    if (emojiGifts.length > 500) emojiGifts.length = 500;
    res.json({ success: true, gift });
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
