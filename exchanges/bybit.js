const WebSocket = require('ws');
const { updatePrice } = require('../priceStore');

const pairs = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  SOL: 'SOLUSDT',
  SHIB: 'SHIBUSDT',
  PEPE: 'PEPEUSDT',
  DOT: 'DOTUSDT',
  ADA: 'ADAUSDT',
  DOGE: 'DOGEUSDT',
};


function connectBybit() {
  const ws = new WebSocket('wss://stream.bybit.com/v5/public/spot');

  ws.on('open', () => {
    const topics = Object.values(pairs).map(s => `tickers.${s}`);
    ws.send(JSON.stringify({
      op: 'subscribe',
      args: topics
    }));
  });

  ws.on('message', (msg) => {
    const parsed = JSON.parse(msg);
    if (parsed.topic?.startsWith('tickers.') && parsed.data) {
      const symbolKey = Object.keys(pairs).find(k => `tickers.${pairs[k]}` === parsed.topic);
      if (symbolKey) {
        updatePrice('bybit', symbolKey, parseFloat(parsed.data.lastPrice));
      }
    }
  });

  ws.on('error', console.error);
}

module.exports = connectBybit;
