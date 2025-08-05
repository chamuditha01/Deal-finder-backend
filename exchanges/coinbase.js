const WebSocket = require('ws');
const { updatePrice } = require('../priceStore');

const pairs = [
  'BTC-USD',
  'ETH-USD',
  'SOL-USD',
  'SHIB-USD',
  'PEPE-USD',
  'DOT-USD',
  'ADA-USD',
  'DOGE-USD',
  'TURBO-USD',
  'XRP-USD',
];



function connectCoinbase() {
  const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');

  ws.on('open', () => {
    ws.send(JSON.stringify({
      type: 'subscribe',
      channels: [{ name: 'ticker', product_ids: pairs }]
    }));
  });

  ws.on('message', (data) => {
    const parsed = JSON.parse(data);
    if (parsed.type === 'ticker') {
      const symbol = parsed.product_id.split('-')[0];
      updatePrice('coinbase', symbol, parseFloat(parsed.price));
    }
  });

  ws.on('error', console.error);
}

module.exports = connectCoinbase;
