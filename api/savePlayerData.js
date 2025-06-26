import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { wallet, banana, stars } = req.body;

  if (!wallet) {
    return res.status(400).json({ error: "Missing wallet" });
  }

  const SUPABASE_URL = "https://vhvtnpczvqqgibtakgab.supabase.co/rest/v1/players";
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  console.log("🔐 Supabase Key:", SUPABASE_KEY ? "✅ Present" : "❌ Missing");

  const headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Prefer": "return=representation",
    "request.headers.wallet": wallet,
  };

  const body = JSON.stringify([{ wallet, banana, stars }]);

  try {
    const response = await fetch(SUPABASE_URL, {
      method: "POST",
      headers,
      body,
    });

    let data;
    try {
      data = await response.json();
    } catch (err) {
      console.warn("⚠️ Supabase returned non-JSON response");
      data = null;
    }

    console.log("📦 Supabase Response Status:", response.status);
    console.log("📨 Supabase Response Body:", data);

    if (!response.ok) {
      return res.status(response.status).json({ error: data || "Unknown Supabase error" });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("🔥 Unexpected error:", err.message);
    return res.status(500).json({ error: "Unexpected error", details: err.message });
  }
}
