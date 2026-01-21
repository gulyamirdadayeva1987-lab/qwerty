// server.js - improved Express backend with safer Telegram handling & logs
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Use global fetch if Node >=18, otherwise fall back to node-fetch
let fetchImpl = global.fetch;
if (!fetchImpl) {
    try {
        fetchImpl = require('node-fetch');
    } catch (e) {
        console.error('node-fetch is required for Node < 18. Install: npm install node-fetch');
        process.exit(1);
    }
}

const app = express();
app.use(cors());
app.use(express.json());

const BOT = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = process.env.TELEGRAM_CHAT_ID;

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.post('/api/sendOrder', async (req, res) => {
    console.log('--- /api/sendOrder called ---', new Date().toISOString());
    console.log('Env present:', { bot: !!BOT, chat: !!CHAT });

    try {
        const { items, total, phone, created_at } = req.body || {};
        console.log('Incoming body:', req.body);

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Items required and must be a non-empty array' });
        }
        if (!BOT || !CHAT) {
            return res.status(500).json({ error: 'Server misconfiguration: TELEGRAM env vars missing' });
        }

        const lines = [
            "Yangi buyurtma - INKORE",
            `Vaqt: ${new Date(created_at || Date.now()).toLocaleString()}`,
            ""
        ];
        items.forEach(it => {
            lines.push(`${it.title} — ${it.qty} x ${it.price} UZS = ${Number(it.qty) * Number(it.price)} UZS`);
        });
        lines.push("", `Jami: ${Number(total).toLocaleString()} UZS`);
        const text = lines.join("\n");

        console.log('Sending message to Telegram chat:', CHAT);
        const tgResp = await fetchImpl(`https://api.telegram.org/bot${BOT}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT, text })
        });

        const respText = await tgResp.text();
        let tgJson;
        try {
            tgJson = respText ? JSON.parse(respText) : {};
        } catch (e) {
            tgJson = { raw: respText };
        }

        console.log('Telegram response status:', tgResp.status, 'body:', tgJson);

        if (!tgResp.ok || (tgJson && tgJson.ok === false)) {
            // include Telegram detail so frontend/dev can see reason
            return res.status(502).json({ error: 'Telegram API error', detail: tgJson });
        }

        return res.status(200).json({ ok: true, result: tgJson.result || tgJson });
    } catch (err) {
        console.error('Internal server error:', err && (err.stack || err));
        return res.status(500).json({ error: 'Internal error', detail: err?.message || String(err) });
    }
});

const PORT = process.env.PORT || 9000;

app.listen(PORT, () => console.log(`API server listening on ${PORT}`));
