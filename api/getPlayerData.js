// File: api/getPlayerData.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: "Missing wallet" });

  const SUPABASE_URL = `https://vhvtnpczvqqgibtakgab.supabase.co/rest/v1/players?wallet=eq.${wallet}`;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  try {
    const response = await fetch(SUPABASE_URL, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });

    const data = await response.json();
    return res.status(200).json({ data: data[0] || null });
  } catch (err) {
    return res.status(500).json({ error: "Unexpected error", details: err.message });
  }
}
