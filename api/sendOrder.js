// Vercel serverless function (Node 18+). Fayl: /api/sendOrder.js
// ENV required:
//   TELEGRAM_BOT_TOKEN
//   TELEGRAM_CHAT_ID
//
// Deploy on Vercel (recommended) or convert for Netlify.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { items, total, created_at } = req.body || {};
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Items required" });
  }

  const BOT = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT = process.env.TELEGRAM_CHAT_ID;

  if (!BOT || !CHAT) {
    return res.status(500).json({ error: "Server misconfiguration: telegram env vars missing" });
  }

  try {
    const lines = [
      "Yangi buyurtma - INKORE",
      `Vaqt: ${new Date(created_at || Date.now()).toLocaleString()}`,
      ""
    ];
    items.forEach(it => {
      lines.push(`${it.title} — ${it.qty} x ${it.price} UZS = ${Number(it.qty) * Number(it.price)} UZS`);
    });
    lines.push("");
    lines.push(`Jami: ${Number(total).toLocaleString()} UZS`);

    const text = lines.join("\n");

    const resp = await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT, text })
    });

    const json = await resp.json();
    if (!json.ok) {
      console.error("Telegram error:", json);
      return res.status(502).json({ error: "Telegram API error", detail: json });
    }

    return res.status(200).json({ ok: true, result: json.result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal error", detail: err.message });
  }
}