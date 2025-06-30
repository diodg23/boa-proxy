import fetch from "node-fetch";

export default async function handler(req, res) {
  // ✅ Tambahkan CORS Header di awal
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ✅ Tangani preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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

  const { action, wallet, banana, stars, result, skillName, newLevel, newBanana } = req.body;

  if (!action) return res.status(400).json({ error: "Missing action" });

  try {
    // 1. SAVE PLAYER (tambahkan dukungan untuk skills)
    if (action === "save") {
      if (!wallet) return res.status(400).json({ error: "Missing wallet" });

      const playerData = {
        wallet,
        ...(banana !== undefined && { banana }),
        ...(stars !== undefined && { stars }),
        ...(req.body.skills && { skills: req.body.skills }),
      };

      const response = await fetch(SUPABASE_URL, {
        method: "POST",
        headers: {
          ...headers,
          "Prefer": "resolution=merge-duplicates, return=representation",
        },
        body: JSON.stringify([playerData]),
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
        headers: {
          ...headers,
          "Prefer": "return=representation",
        },
        body: JSON.stringify({ stars }),
      });

      const data = await response.json();
      return res.status(response.ok ? 200 : 400).json(response.ok ? { success: true, data } : { error: data });
    }

    // 4. UPDATE STARS BERDASARKAN HASIL (WIN/LOSE)
    if (action === "updateResult") {
      if (!wallet || !["win", "lose"].includes(result)) {
        return res.status(400).json({ error: "Missing wallet or invalid result" });
      }

      const getRes = await fetch(`${SUPABASE_URL}?wallet=eq.${wallet}`, {
        method: "GET",
        headers,
      });
      const [player] = await getRes.json();

      if (!player) return res.status(404).json({ error: "Player not found" });

      const delta = result === "win" ? 20 : -10;
      const newStars = Math.max((player.stars || 0) + delta, 0);

      const updateRes = await fetch(`${SUPABASE_URL}?wallet=eq.${wallet}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ stars: newStars }),
      });

      if (updateRes.status === 204) {
        return res.status(200).json({ success: true, wallet, newStars });
      }

      const updateData = await updateRes.json();
      return res.status(updateRes.ok ? 200 : 400).json(updateRes.ok ? { success: true, updateData } : { error: updateData });
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

    // 6. UPGRADE SKILL
    if (action === "upgradeSkill") {
  if (!wallet || !skillName || typeof newLevel !== "number" || typeof newBanana !== "number") {
    console.error("❌ Invalid upgradeSkill input:", { wallet, skillName, newLevel, newBanana });
    return res.status(400).json({ error: "Missing or invalid wallet, skillName, newLevel, or newBanana" });
  }

  // Ambil data player
  const getRes = await fetch(`${SUPABASE_URL}?wallet=eq.${wallet}`, {
    method: "GET",
    headers,
  });

  const [player] = await getRes.json();

  if (!player) {
    console.error("❌ Player not found for upgradeSkill:", wallet);
    return res.status(404).json({ error: "Player not found" });
  }

  // Update skill dan banana
  const updatedSkills = {
    ...(player.skills || {}),
    [skillName]: newLevel,
  };

  const updateRes = await fetch(`${SUPABASE_URL}?wallet=eq.${wallet}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      banana: newBanana,
      skills: updatedSkills,
    }),
  });

  if (updateRes.status === 204) {
    return res.status(200).json({ success: true, wallet, skillName, newLevel, newBanana });
  }

  const updateData = await updateRes.json();
  console.error("❌ Failed to upgradeSkill response:", updateData);
  return res.status(updateRes.ok ? 200 : 400).json(updateRes.ok ? { success: true, updateData } : { error: updateData });
}
    // Jika action tidak dikenal
    return res.status(400).json({ error: "Invalid action" });

  } catch (err) {
    return res.status(500).json({ error: "Unexpected error", details: err.message });
  }
}
