import nacl from "tweetnacl";
import bs58 from "bs58";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { wallet, message, signature } = req.body;

  if (!wallet || !message || !signature) {
    return res.status(400).json({ error: "Missing wallet, message, or signature" });
  }

  try {
    // ✅ Verifikasi Signature Solana
    const verified = nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      bs58.decode(signature),
      bs58.decode(wallet)
    );

    if (!verified) {
      return res.status(403).json({ error: "Invalid signature" });
    }

    // ✅ Generate session token
    const token = crypto.randomBytes(32).toString("hex");

    // ✅ Simpan session token ke Supabase
    const supabaseUrl = "https://vhvtnpczvqqgibtakgab.supabase.co/rest/v1/sessions";
    const supabaseKey = process.env.SUPABASE_KEY;
    const headers = {
      "Content-Type": "application/json",
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`,
    };

    const store = await fetch(supabaseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify([{ wallet, token, created_at: new Date().toISOString() }]),
    });

    if (!store.ok) {
      const error = await store.text();
      return res.status(500).json({ error });
    }

    return res.status(200).json({ sessionToken: token });
  } catch (err) {
    return res.status(500).json({ error: "Unexpected error", details: err.message });
  }
}
