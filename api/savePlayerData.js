import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
    // 1. SAVE PLAYER
    if (action === "save") {
      if (!wallet) return res.status(400).json({ error: "Missing wallet" });

      const response = await fetch(SUPABASE_URL, {
        method: "POST",
        headers: {
          ...headers,
          "Prefer": "resolution=merge-duplicates, return=representation",
          "request.headers.wallet": wallet,
        },
        body: JSON.stringify([{ wallet, banana, stars }]),
      });

      const data = await response.json();
      return res.status(response.ok ? 200 : 400).json(response.ok ? { success: true, data } : { error: data });
    }

    // 2. GET PLAYER DATA
    if (action === "get") {
      if (!wallet) return res.status(400).json({ error: "Missing wallet" });

      const response = await fetch(`${SUPABASE_URL}?wallet=eq.${wallet}`, {
        method: "GET",
        headers,
      });

      const data = await response.json();
      return res.status(200).json(data?.[0] || {});
    }

    // 3. UPDATE STARS LANGSUNG
    if (action === "updateStars") {
      if (!wallet || typeof stars !== "number")
        return res.status(400).json({ error: "Missing wallet or stars (must be number)" });

      const response = await fetch(`${SUPABASE_URL}?wallet=eq.${wallet}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ stars }),
      });

      const data = await response.json();
      return res.status(response.ok ? 200 : 400).json(response.ok ? { success: true, data } : { error: data });
    }

    // 4. UPDATE STARS BERDASARKAN HASIL (WIN/LOSE)
    if (action === "updateResult") {
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

    // 5. LEADERBOARD
    if (action === "leaderboard") {
      const response = await fetch(`${SUPABASE_URL}?order=stars.desc&limit=10`, {
        method: "GET",
        headers,
      });

      const data = await response.json();
      return res.status(200).json(data);
    }

    // Jika action tidak dikenal
    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    return res.status(500).json({ error: "Unexpected error", details: err.message });
  }
}
