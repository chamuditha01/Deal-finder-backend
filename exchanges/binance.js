const WebSocket = require('ws');
const { updatePrice } = require('../priceStore');

const pairs = {
  BTC: 'btcusdt',
  ETH: 'ethusdt',
  SOL: 'solusdt',
  SHIB: 'shibusdt',
  PEPE: 'pepeusdt',
  DOT: 'dotusdt',
  ADA: 'adausdt',
};

function connectBinance() {
  const streamNames = Object.values(pairs).map(p => `${p}@ticker`).join('/');
  const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streamNames}`);

  ws.on('message', (data) => {
    const parsed = JSON.parse(data);
    const symbolKey = Object.keys(pairs).find(key => pairs[key] === parsed.data.s.toLowerCase());
    if (symbolKey) {
      updatePrice('binance', symbolKey, parseFloat(parsed.data.c));
    }
  });

  ws.on('error', console.error);
}

module.exports = connectBinance;
