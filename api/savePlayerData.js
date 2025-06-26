import fetch from "node-fetch";

export default async function handler(req, res) {
  const SUPABASE_URL = "https://vhvtnpczvqqgibtakgab.supabase.co/rest/v1/players";
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  const headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
  };

  const { action, wallet, banana, stars, result } = req.body;

  if (!action) return res.status(400).json({ error: "Missing action" });

  try {
    if (action === "save") {
      if (!wallet) return res.status(400).json({ error: "Missing wallet" });

      const response = await fetch(SUPABASE_URL, {
        method: "POST",
        headers: {
          ...headers,
          "Prefer": "resolution=merge-duplicates",
          "request.headers.wallet": wallet
        },
        body: JSON.stringify([{ wallet, banana, stars }]),
      });

      const data = await response.json();
      return res.status(response.ok ? 200 : 400).json(response.ok ? { success: true, data } : { error: data });
    }

    if (action === "get") {
      if (!wallet) return res.status(400).json({ error: "Missing wallet" });

      const response = await fetch(`${SUPABASE_URL}?wallet=eq.${wallet}`, {
        method: "GET",
        headers,
      });

      const data = await response.json();
      return res.status(200).json(data?.[0] || {});
    }

    if (action === "update") {
      if (!wallet || !result) return res.status(400).json({ error: "Missing wallet or result" });

      const increment = result === "win" ? 1 : result === "lose" ? -1 : 0;

      const response = await fetch(`${SUPABASE_URL}?wallet=eq.${wallet}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ stars: { increment } }),
      });

      const data = await response.json();
      return res.status(response.ok ? 200 : 400).json(response.ok ? { success: true, data } : { error: data });
    }

    if (action === "leaderboard") {
      const response = await fetch(`${SUPABASE_URL}?order=stars.desc&limit=10`, {
        method: "GET",
        headers,
      });

      const data = await response.json();
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    return res.status(500).json({ error: "Unexpected error", details: err.message });
  }
}
