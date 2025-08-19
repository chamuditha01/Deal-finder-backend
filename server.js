const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = 5000;

// Enable CORS for all requests
app.use(cors());

const CMC_API_KEY = "e895d238-4dc7-48a3-8ea7-6f4489147266"; // Replace with your actual CMC API key

const cache = {};
// Coins and platforms you want
const coins = ["BTC", "ETH", "PEPE", "SOL", "DOGE", "SHIB", "XRP"];
const quote = "USDT";

// API Endpoints
const apis = {
  binance: (symbol) =>
    `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}${quote}`,
  coinbase: (symbol) =>
    `https://api.coinbase.com/v2/prices/${symbol}-${quote}/spot`,
  bybit: (symbol) =>
    `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}${quote}`,
  kucoin: (symbol) =>
    `https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${symbol}-${quote}`,
};

// Fetch from Binance
async function getBinancePrice(symbol) {
  try {
    const res = await axios.get(apis.binance(symbol));
    return parseFloat(res.data.price);
  } catch {
    return null;
  }
}

async function fetchWithRetry(url, options, retries = 3, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, options);
      return response;
    } catch (error) {
      if (error.response?.status === 429 || error.response?.data?.status?.error_code === 1011) {
        if (i < retries - 1) {
          console.warn(`⚠ Rate limit hit, retrying in ${delay}ms... (attempt ${i + 1}/${retries})`);
          await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
          continue;
        }
      }
      throw error;
    }
  }
}

// Fetch from Coinbase
async function getCoinbasePrice(symbol) {
  try {
    const res = await axios.get(apis.coinbase(symbol));
    return parseFloat(res.data.data.amount);
  } catch {
    return null;
  }
}

// Fetch from Bybit
async function getBybitPrice(symbol) {
  try {
    const res = await axios.get(apis.bybit(symbol));
    return parseFloat(res.data.result.list[0].lastPrice);
  } catch {
    return null;
  }
}

// Fetch from KuCoin
async function getKucoinPrice(symbol) {
  try {
    const res = await axios.get(apis.kucoin(symbol));
    return parseFloat(res.data.data.price);
  } catch {
    return null;
  }
}

// Function to get prices for all coins
async function getPrices() {
  const results = {};
  for (const coin of coins) {
    const [binance, coinbase, bybit, kucoin] = await Promise.all([
      getBinancePrice(coin),
      getCoinbasePrice(coin),
      getBybitPrice(coin),
      getKucoinPrice(coin),
    ]);

    results[coin] = {
      Binance: binance,
      Coinbase: coinbase,
      Bybit: bybit,
      KuCoin: kucoin,
    };
  }
  return results;
}

// API endpoint for prices
app.get("/prices", async (req, res) => {
  const prices = await getPrices();
  res.json(prices);
});

// API endpoint for market data (support multiple symbols)
app.get("/api/market-data", async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) {
    return res.status(400).json({ error: "Missing symbol parameter" });
  }

  const symbols = symbol.split(",").map((s) => s.toUpperCase());

  // Check cache (expires after 5 minutes)
  const cacheKey = symbols.join(",");
  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < 300000) {
    console.log(`📨 Serving cached CMC data for ${cacheKey}`);
    return res.json(cache[cacheKey].data);
  }

  try {
    const response = await fetchWithRetry(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbols.join(",")}`,
      {
        headers: { "X-CMC_PRO_API_KEY": CMC_API_KEY },
      }
    );
    const data = response.data;

    if (!data.data || Object.keys(data.data).length === 0) {
      return res.status(404).json({ error: `No data found for symbols ${symbols.join(",")}` });
    }

    cache[cacheKey] = { data, timestamp: Date.now() };
    res.json(data);
  } catch (error) {
    console.error("❌ CMC API Error:", error.response?.data || error.message);
    if (error.response?.status === 429 || error.response?.data?.status?.error_code === 1011) {
      // Fallback data to prevent frontend errors
      const fallbackData = {
        data: symbols.reduce((acc, sym) => {
          acc[sym] = {
            quote: {
              USD: {
                volume_24h: 0,
                percent_change_7d: 0,
                percent_change_24h: 0,
              },
            },
          };
          return acc;
        }, {}),
      };
      cache[cacheKey] = { data: fallbackData, timestamp: Date.now() };
      res.status(429).json(fallbackData);
    } else {
      res.status(500).json({ error: "Failed to fetch market data", details: error.message });
    }
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});