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

app.listen(PORT, () => {
  console.log(`Crypto WebSocket server running on http://localhost:${PORT}`);
});
