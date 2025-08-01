const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = 5000;

const corsOptions = {
  origin: ["http://localhost:3000", "https://cryptodealfinder.netlify.app"],
  methods: ["GET", "POST"],
  credentials: false,
};

app.use(cors(corsOptions));


app.use(cors(corsOptions));


const coinGeckoCache = {};
const COINGECKO_CACHE_TTL = 30 * 1000; // 30 seconds

app.get("/price/coingecko/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const now = Date.now();

  // Serve from cache if available and fresh
  if (coinGeckoCache[symbol] && now - coinGeckoCache[symbol].timestamp < COINGECKO_CACHE_TTL) {
    return res.json(coinGeckoCache[symbol].data);
  }

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
    const response = await axios.get(url);

    const data = response.data[symbol];
    if (!data) {
      return res.status(404).json({ error: "Symbol not found" });
    }

    const formatted = {
      price: data.usd,
      change24h: data.usd_24h_change,
      volume24h: data.usd_24h_vol,
      marketCap: data.usd_market_cap,
      source: "CoinGecko"
    };

    // Save to cache
    coinGeckoCache[symbol] = {
      timestamp: now,
      data: formatted
    };

    res.json(formatted);
  } catch (error) {
    console.error("CoinGecko API error:", error.message);
    res.status(500).json({ error: "CoinGecko rate limit exceeded or network error" });
  }
});


// ===== BINANCE =====
app.get("/price/binance/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const formattedSymbol = symbol.toUpperCase() + "USDT"; // e.g., BTC -> BTCUSDT
    const response = await axios.get(
      `https://api.binance.com/api/v3/ticker/price?symbol=${formattedSymbol}`
    );
    res.json({ source: "binance", data: response.data });
  } catch (err) {
    res.status(500).json({ error: "Error fetching from Binance" });
  }
});1


// ===== KRAKEN =====
app.get("/price/kraken/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const symbolMap = {
      btc: "XXBTZUSD",
      eth: "XETHZUSD",
      ada: "ADAUSD",
      sol: "SOLUSD",
      dot: "DOTUSD",
      hbar: "HBARUSD",
    };

    const krakenSymbol = symbolMap[symbol.toLowerCase()];
    if (!krakenSymbol) {
      return res.status(400).json({ error: "Unsupported symbol for Kraken" });
    }

    const url = `https://api.kraken.com/0/public/Ticker?pair=${krakenSymbol}`;
    const response = await axios.get(url);
    const ticker = response.data.result[krakenSymbol];

    const formatted = {
      price: parseFloat(ticker.c[0]), // current price
      high: parseFloat(ticker.h[1]),
      low: parseFloat(ticker.l[1]),
      volume: parseFloat(ticker.v[1]),
      source: "Kraken"
    };

    res.json(formatted);
  } catch (error) {
    console.error("Kraken API error:", error.message);
    res.status(500).json({ error: "Error fetching from Kraken" });
  }
});

// ===== BYBIT =====


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
