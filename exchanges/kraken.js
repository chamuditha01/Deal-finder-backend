const WebSocket = require('ws');
const { updatePrice } = require('../priceStore');

const pairs = {
  BTC: 'XBT/USD',
  ETH: 'ETH/USD',
  SOL: 'SOL/USD',
  SHIB: 'SHIB/USD',
  PEPE: 'PEPE/USD',
  DOT: 'DOT/USD',
  ADA: 'ADA/USD',
  DOGE: 'DOGE/USD',
  TURBO: 'TURBO/USD',
  XRP: 'XRP/USD',
};

function connectKraken() {
  const ws = new WebSocket('wss://ws.kraken.com');

  ws.on('open', () => {
    const subscriptions = Object.values(pairs).map(pair => ({
      event: 'subscribe',
      pair: [pair],
      subscription: { name: 'ticker' },
    }));

    subscriptions.forEach(sub => ws.send(JSON.stringify(sub)));
    console.log('[Kraken] Subscribed to ticker channels');
  });

  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length < 2) return;

      const [channelID, tickerData, , pair] = parsed;
      if (!tickerData || !tickerData.c) return;

      const price = parseFloat(tickerData.c[0]); // c = last trade price
      const symbol = Object.keys(pairs).find(key => pairs[key] === pair);
      if (symbol) {
        updatePrice('Kraken', symbol, price);
      }
    } catch (err) {
      console.error('[Kraken] Error parsing message', err.message);
    }
  });

  ws.on('error', (err) => {
    console.error('[Kraken] WebSocket error:', err.message);
  });

  ws.on('close', () => {
    console.warn('[Kraken] Connection closed, reconnecting in 5s...');
    setTimeout(connectKraken, 5000);
  });
}

module.exports = connectKraken;
