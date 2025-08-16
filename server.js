const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

const { getPrices } = require('./priceStore');
const connectBinance = require('./exchanges/binance');
const connectCoinbase = require('./exchanges/coinbase');
const connectKucoin = require('./exchanges/kucoin');
const connectBybit = require('./exchanges/bybit');
const connectKraken = require('./exchanges/kraken');

// Enable CORS only for localhost:3000
app.use(cors({
  origin: ['http://localhost:3000', 'https://cryptodealfinder.netlify.app']
}));

connectBinance();
connectCoinbase();
connectKucoin();
connectBybit();
connectKraken();

app.get('/prices', (req, res) => {
  res.json(getPrices());
});


// Binance API credentials
const BINANCE_API_KEY = 'ZESoEgli2PZVNAduBOuYt6XlikCl0InJFkXSHJdvdSfxkdAW9ljieP1nOuIZ0nDm';
const BINANCE_SECRET = 'StL4MozB7bvxGn02wE2P9smRiLmkMGo5v5AlCgacJYOHlYX04Ptl2pFYesehtpMA';

// Your symbol map
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

// Fetch Binance server time
async function getBinanceServerTime() {
  const response = await axios.get('https://api.binance.com/api/v3/time');
  return response.data.serverTime;
}

// Fetch all trade fees from Binance
async function getAllBinanceFees() {
  const serverTime = await getBinanceServerTime();
  const query = `timestamp=${serverTime}`;
  const signature = crypto
    .createHmac('sha256', BINANCE_SECRET)
    .update(query)
    .digest('hex');

  const url = `https://api.binance.com/sapi/v1/asset/tradeFee?${query}&signature=${signature}`;

  const response = await axios.get(url, {
    headers: {
      'X-MBX-APIKEY': BINANCE_API_KEY
    }
  });

  const allFees = response.data;

  // Filter for your defined symbols only
  const filteredFees = Object.entries(pairs).map(([key, symbol]) => {
    const fee = allFees.find(f => f.symbol.toLowerCase() === symbol.toLowerCase());
    return {
      name: key,
      symbol: symbol.toUpperCase(),
      makerFee: parseFloat(fee?.makerCommission || 0),
      takerFee: parseFloat(fee?.takerCommission || 0)
    };
  });

  return filteredFees;
}

// API rout
app.get('/api/fees', async (req, res) => {
  try {
    const fees = await getAllBinanceFees();
    res.json(fees);
  } catch (error) {
    console.error('Binance error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch Binance fees' });
  }
});



app.listen(PORT, () => {
  console.log(`Crypto WebSocket server running on http://localhost:${PORT}`);
});
