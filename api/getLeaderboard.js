// /api/getLeaderboard.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  const SUPABASE_URL = "https://vhvtnpczvqqgibtakgab.supabase.co/rest/v1/players?order=stars.desc&limit=10";
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
  };

  try {
    const response = await fetch(SUPABASE_URL, { headers });
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    return res.status(200).json({ success: true, leaderboard: data });
  } catch (err) {
    return res.status(500).json({ error: "Unexpected error", details: err.message });
  }
}
