const priceStore = {};

function updatePrice(exchange, symbol, price) {
  if (!priceStore[symbol]) priceStore[symbol] = {};
  priceStore[symbol][exchange] = price;
}

function getPrices() {
  return priceStore;
}

module.exports = { updatePrice, getPrices };
