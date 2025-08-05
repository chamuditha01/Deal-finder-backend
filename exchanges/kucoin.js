const WebSocket = require('ws');
const axios = require('axios');
const { updatePrice } = require('../priceStore');

const pairs = {
  BTC: 'BTC-USDT',
  ETH: 'ETH-USDT',
  SOL: 'SOL-USDT',
  SHIB: 'SHIB-USDT',
  PEPE: 'PEPE-USDT',
  DOT: 'DOT-USDT',
  ADA: 'ADA-USDT',
  DOGE: 'DOGE-USDT',
  TURBO: 'TURBO-USDT',
  XRP: 'XRP-USDT',
};



async function connectKucoin() {
  const { data } = await axios.post('https://api.kucoin.com/api/v1/bullet-public');
  const ws = new WebSocket(data.data.instanceServers[0].endpoint + '?token=' + data.data.token);

  ws.on('open', () => {
    for (let symbol in pairs) {
      ws.send(JSON.stringify({
        id: `${Date.now()}${symbol}`,
        type: 'subscribe',
        topic: `/market/ticker:${pairs[symbol]}`,
        privateChannel: false,
        response: true
      }));
    }
  });

  ws.on('message', (msg) => {
    const parsed = JSON.parse(msg);
    if (parsed.topic?.includes('/market/ticker:')) {
      const symbol = Object.keys(pairs).find(s => parsed.topic.endsWith(pairs[s]));
      if (symbol && parsed.data) {
        updatePrice('kucoin', symbol, parseFloat(parsed.data.price));
      }
    }
  });

  ws.on('error', console.error);
}

module.exports = connectKucoin;
