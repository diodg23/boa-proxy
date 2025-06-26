import fetch from "node-fetch";

const SUPABASE_URL = "https://vhvtnpczvqqgibtakgab.supabase.co/rest/v1/players";
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const headers = (wallet) => ({
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  Prefer: "resolution=merge-duplicates",
  "request.headers.wallet": wallet || "",
});

export default async function handler(req, res) {
  const { method, query, body } = req;

  if (method === "POST") {
    const { wallet, banana, stars } = body;
    if (!wallet) return res.status(400).json({ error: "Missing wallet" });

    try {
      const response = await fetch(SUPABASE_URL, {
        method: "POST",
        headers: headers(wallet),
        body: JSON.stringify([{ wallet, banana, stars }]),
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: data });
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ error: "Unexpected error", details: err.message });
    }
  }

  if (method === "GET" && query.leaderboard === "true") {
    try {
      const response = await fetch(`${SUPABASE_URL}?order=stars.desc&limit=10`, {
        method: "GET",
        headers: headers(),
      });
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: "Error fetching leaderboard", details: err.message });
    }
  }

  if (method === "GET" && query.wallet) {
    try {
      const response = await fetch(`${SUPABASE_URL}?wallet=eq.${query.wallet}`, {
        method: "GET",
        headers: headers(query.wallet),
      });
      const data = await response.json();
      return res.status(200).json(data[0] || null);
    } catch (err) {
      return res.status(500).json({ error: "Error fetching player", details: err.message });
    }
  }

  if (method === "PATCH") {
    const { wallet, result } = body; // result = 'win' or 'lose'
    const delta = result === "win" ? 1 : -1;
    if (!wallet) return res.status(400).json({ error: "Missing wallet" });

    try {
      const response = await fetch(`${SUPABASE_URL}?wallet=eq.${wallet}`, {
        method: "PATCH",
        headers: headers(wallet),
        body: JSON.stringify({ stars: { increment: delta } }),
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: data });
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ error: "Error updating stars", details: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
