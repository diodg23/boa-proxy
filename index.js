
// proxy-api/index.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Ganti dengan data Supabase kamu
const SUPABASE_URL = "https://vhvtnpczvqqgibtakgab.supabase.co/rest/v1/players";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZodnRucGN6dnFxZ2lidGFrZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NTU5MzQsImV4cCI6MjA2NjUzMTkzNH0.XdV4dz0YVUwEIdnyP6L2BAjLYMPdIt863-Bfn60gZ6s";

app.use(cors());
app.use(express.json());

app.post("/savePlayerData", async (req, res) => {
  const { wallet, banana, stars } = req.body;

  if (!wallet) return res.status(400).json({ error: "Missing wallet" });

  try {
    const response = await fetch(SUPABASE_URL, {
      method: "POST",
      headers: {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Prefer": "resolution=merge-duplicates",
  "request.headers.wallet": wallet
      },
      body: JSON.stringify([{ wallet, banana, stars }])
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: "Unexpected server error", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server listening on port ${PORT}`);
});
