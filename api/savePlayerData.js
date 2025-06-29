import crypto from "crypto";
import fetch from "node-fetch";
import nacl from "tweetnacl";
import bs58 from "bs58";

function isValidSignatureForPayload(data, signature, secret) {
  const payload = {
    action: data.action,
    wallet: data.wallet,
    ...(data.banana !== undefined ? { banana: data.banana } : {}),
    ...(data.stars !== undefined ? { stars: data.stars } : {}),
    ...(data.result !== undefined ? { result: data.result } : {}),
    ...(data.skillName ? { skillName: data.skillName } : {}),
    ...(data.newLevel !== undefined ? { newLevel: data.newLevel } : {}),
    ...(data.newBanana !== undefined ? { newBanana: data.newBanana } : {}),
  };
  const hash = crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
  return hash === signature;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-signature");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const {
    action, wallet, message, signature,
    banana, stars, result, skillName, newLevel, newBanana, sessionToken
  } = req.body;

  if (!action) return res.status(400).json({ error: "Missing action" });

  const SUPABASE_URL = "https://vhvtnpczvqqgibtakgab.supabase.co/rest/v1/players";
  const SESSION_URL = "https://vhvtnpczvqqgibtakgab.supabase.co/rest/v1/sessions";
  const SUPABASE_KEY = process.env.SUPABASE_KEY;
  const secret = process.env.HMAC_SECRET;

  const headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
  };

  try {
    if (action === "login") {
      if (!wallet || !message || !signature) {
        return res.status(400).json({ error: "Missing wallet, message, or signature" });
      }

      const verified = nacl.sign.detached.verify(
        new TextEncoder().encode(message),
        bs58.decode(signature),
        bs58.decode(wallet)
      );

      if (!verified) {
        return res.status(403).json({ error: "Invalid signature" });
      }

      const newToken = crypto.randomBytes(32).toString("hex");

      const sessionStore = await fetch(SESSION_URL, {
        method: "POST",
        headers,
        body: JSON.stringify([{
          wallet,
          token: newToken,
          created_at: new Date().toISOString()
        }]),
      });

      if (!sessionStore.ok) {
        const error = await sessionStore.text();
        return res.status(500).json({ error });
      }
      return res.status(200).json({
  success: true,
  data: { sessionToken: newToken }
});
    }
    console.log("🔥 Login Response:", {
      action,
      wallet,
      sessionToken,
      banana,
      stars,
      result,
      skillName,
      newLevel,
      newBanana 
    });

    const sig = req.headers["x-signature"];
    if (!sig || !isValidSignatureForPayload(req.body, sig, secret)) {
      return res.status(403).json({ error: "Invalid or missing signature" });
    }

    const sessionRes = await fetch(`${SESSION_URL}?wallet=eq.${wallet}&token=eq.${sessionToken}`, {
      method: "GET",
      headers,
    });
    const sessionData = await sessionRes.json();
    if (!Array.isArray(sessionData) || sessionData.length === 0) {
      return res.status(403).json({ error: "Invalid session token" });
    }

    // Action: SAVE PLAYER
    if (action === "save" && wallet) {
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

    // Action: GET PLAYER DATA
    if (action === "get" && wallet) {
      const response = await fetch(`${SUPABASE_URL}?wallet=eq.${wallet}`, {
        method: "GET",
        headers,
      });

      const data = await response.json();
      return res.status(200).json(data?.[0] || {});
    }

    // Action: UPDATE STARS
    if (action === "updateStars" && wallet && typeof stars === "number") {
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

    // Action: UPDATE RESULT
    if (action === "updateResult" && wallet && ["win", "lose"].includes(result)) {
      const getRes = await fetch(`${SUPABASE_URL}?wallet=eq.${wallet}`, { method: "GET", headers });
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

    // Action: LEADERBOARD
    if (action === "leaderboard") {
      const response = await fetch(`${SUPABASE_URL}?order=stars.desc&limit=10`, {
        method: "GET",
        headers,
      });

      const data = await response.json();
      return res.status(200).json(Array.isArray(data) ? data : []);
    }

    // Action: UPGRADE SKILL
    if (action === "upgradeSkill" && wallet && skillName && typeof newLevel === "number" && typeof newBanana === "number") {
      const getRes = await fetch(`${SUPABASE_URL}?wallet=eq.${wallet}`, { method: "GET", headers });
      const [player] = await getRes.json();
      if (!player) return res.status(404).json({ error: "Player not found" });

      const updatedSkills = {
        ...(player.skills || {}),
        [skillName]: newLevel,
      };

      const updateRes = await fetch(`${SUPABASE_URL}?wallet=eq.${wallet}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ banana: newBanana, skills: updatedSkills }),
      });

      if (updateRes.status === 204) {
        return res.status(200).json({ success: true, wallet, skillName, newLevel, newBanana });
      }

      const updateData = await updateRes.json();
      return res.status(updateRes.ok ? 200 : 400).json(updateRes.ok ? { success: true, updateData } : { error: updateData });
    }
    return res.status(400).json({ error: "Invalid or missing action" });
  } catch (err) {
    console.error("🔥 BACKEND ERROR DETAILS:", err);
    return res.status(500).json({ error: "Unexpected error", details: err.message });
  }
}
