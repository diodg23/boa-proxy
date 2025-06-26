// proxy-api/index.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Ganti dengan data Supabase kamu
const SUPABASE_URL = "https://vhvtnpczvqqgibtakgab.supabase.co/rest/v1/players";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // skrinsupabasenya disingkat untuk keamanan

app.use(cors());
app.use(express.json());

app.post("/savePlayerData", async (req, res) => {
  const { wallet, banana, stars } = req.body;

  if (!wallet) {
    return res.status(400).json({ error: "Missing wallet" });
  }

  const headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Prefer": "resolution=merge-duplicates",
    "request.headers.wallet": wallet // ✅ penting agar RLS Supabase mengenali
  };

  console.log("Headers being sent:", headers);
  console.log("Data being sent:", { wallet, banana, stars });

  try {
    const response = await fetch(SUPABASE_URL, {
      method: "POST",
      headers: headers,
      body: JSON.stringify([{ wallet, banana, stars }])
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ error: "Unexpected server error", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Proxy server listening on port ${PORT}`);
});
