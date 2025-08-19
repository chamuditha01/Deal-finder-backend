const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = 5000;

const { getPrices } = require('./priceStore');
const connectBinance = require('./exchanges/binance');
const connectCoinbase = require('./exchanges/coinbase');
const connectKucoin = require('./exchanges/kucoin');
const connectBybit = require('./exchanges/bybit');
const connectKraken = require('./exchanges/kraken');

// Hardcoded API keys (⚠ SECURITY WARNING: Avoid hardcoding in production)
const BINANCE_API_KEY = 'ZESoEgli2PZVNAduBOuYt6XlikCl0InJFkXSHJdvdSfxkdAW9ljieP1nOuIZ0nDm';
const BINANCE_SECRET = 'StL4MozB7bvxGn02wE2P9smRiLmkMGo5v5AlCgacJYOHlYX04Ptl2pFYesehtpMA';
const CMC_API_KEY = 'e895d238-4dc7-48a3-8ea7-6f4489147266'; // Replace with your actual CMC API key

// Enable CORS
app.use(cors({
  origin: ['http://localhost:3000', 'https://cryptodealfinder.netlify.app'],
  methods: ['GET'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// Initialize exchange WebSocket connections
connectBinance();
connectCoinbase();
connectKucoin();
connectBybit();
connectKraken();

// Symbol map for Binance
const pairs = {
  BTC: 'btcusdt',
  ETH: 'ethusdt',
  SOL: 'solusdt',
  SHIB: 'shibusdt',
  PEPE: 'pepeusdt',
  DOT: 'dotusdt',
  ADA: 'adausdt',
  DOGE: 'dogeusdt',
  TURBO: 'turbousdt',
  XRP: 'xrpusdt',
};

// In-memory cache for CMC data
const cache = {};

// Fetch Binance server time
async function getBinanceServerTime() {
  try {
    const response = await axios.get('https://api.binance.com/api/v3/time');
    return response.data.serverTime;
  } catch (error) {
    console.error('❌ Error fetching Binance server time:', error.message);
    throw error;
  }
}

// Fetch Binance trade fees
async function getAllBinanceFees() {
  const serverTime = await getBinanceServerTime();
  const query = `timestamp=${serverTime}`;
  const signature = crypto
    .createHmac('sha256', BINANCE_SECRET)
    .update(query)
    .digest('hex');

  const url = `https://api.binance.com/sapi/v1/asset/tradeFee?${query}&signature=${signature}`;

  try {
    const response = await axios.get(url, {
      headers: {
        'X-MBX-APIKEY': BINANCE_API_KEY,
      },
    });

    const allFees = response.data;

    // Filter for defined symbols, provide defaults for missing fees
    const filteredFees = Object.entries(pairs).map(([key, symbol]) => {
      const fee = allFees.find(f => f.symbol.toLowerCase() === symbol.toLowerCase()) || {
        symbol,
        makerCommission: '0.001',
        takerCommission: '0.001',
      };
      return {
        name: key,
        symbol: symbol.toUpperCase(),
        makerFee: parseFloat(fee.makerCommission || 0) * 100,
        takerFee: parseFloat(fee.takerCommission || 0) * 100,
      };
    });

    return filteredFees;
  } catch (error) {
    console.error('❌ Error fetching Binance fees:', error.response?.data || error.message);
    throw error;
  }
}

// Prices endpoint
app.get('/prices', (req, res) => {
  try {
    const prices = getPrices();
    if (!prices || Object.keys(prices).length === 0) {
      return res.status(500).json({ error: 'No price data available' });
    }
    res.json(prices);
  } catch (error) {
    console.error('❌ Error in /prices:', error.message);
    res.status(500).json({ error: 'Failed to fetch prices', details: error.message });
  }
});

// Fees endpoint
app.get('/api/fees', async (req, res) => {
  try {
    const fees = await getAllBinanceFees();
    res.json(fees);
  } catch (error) {
    console.error('❌ Binance fees error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch Binance fees', details: error.message });
  }
});

// Retry helper for rate-limited requests
async function fetchWithRetry(url, options, retries = 3, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, options);
      return response;
    } catch (error) {
      if (error.response?.status === 429 || error.response?.data?.status?.error_code === 1011) {
        if (i < retries - 1) {
          console.warn(`⚠ Rate limit hit, retrying in ${delay}ms... (attempt ${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
          continue;
        }
      }
      throw error;
    }
  }
}

// CoinMarketCap market data endpoint
app.get('/api/market-data', async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) {
    return res.status(400).json({ error: 'Missing symbol parameter' });
  }

  const upperSymbol = symbol.toUpperCase();

  // Check cache (expires after 5 minutes)
  if (cache[upperSymbol] && Date.now() - cache[upperSymbol].timestamp < 300000) {
    console.log(`📨 Serving cached CMC data for ${upperSymbol}`);
    return res.json(cache[upperSymbol].data);
  }

  try {
    const response = await fetchWithRetry(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${upperSymbol}`,
      {
        headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY },
      }
    );
    const data = response.data;

    if (!data.data || !data.data[upperSymbol]) {
      return res.status(404).json({ error: `No data found for symbol ${upperSymbol}` });
    }

    cache[upperSymbol] = { data, timestamp: Date.now() };
    res.json(data);
  } catch (error) {
    console.error('❌ CMC API Error:', error.response?.data || error.message);
    if (error.response?.status === 429 || error.response?.data?.status?.error_code === 1011) {
      // Fallback data to prevent frontend errors
      const fallbackData = {
        data: {
          [upperSymbol]: {
            quote: {
              USD: {
                volume_24h: 0,
                percent_change_7d: 0,
                percent_change_24h: 0,
              },
            },
          },
        },
      };
      cache[upperSymbol] = { data: fallbackData, timestamp: Date.now() };
      res.status(429).json(fallbackData);
    } else {
      res.status(500).json({ error: 'Failed to fetch market data', details: error.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Crypto WebSocket server running on http://localhost:${PORT}`);
});