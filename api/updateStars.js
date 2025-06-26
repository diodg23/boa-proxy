// /api/updateStars.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { wallet, change } = req.body;
  if (!wallet || typeof change !== "number") {
    return res.status(400).json({ error: "Missing or invalid data" });
  }

  const SUPABASE_URL = `https://vhvtnpczvqqgibtakgab.supabase.co/rest/v1/players?wallet=eq.${wallet}`;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  };

  try {
    // Get current stars
    const getRes = await fetch(SUPABASE_URL, { headers });
    const users = await getRes.json();
    if (!getRes.ok || users.length === 0) {
      return res.status(404).json({ error: "Player not found" });
    }

    const currentStars = users[0].stars || 0;
    const newStars = Math.max(0, currentStars + change); // prevent negative

    // Update
    const updateRes = await fetch(SUPABASE_URL, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ stars: newStars })
    });

    const updated = await updateRes.json();

    if (!updateRes.ok) {
      return res.status(updateRes.status).json({ error: updated });
    }

    return res.status(200).json({ success: true, updated });
  } catch (err) {
    return res.status(500).json({ error: "Unexpected error", details: err.message });
  }
}
