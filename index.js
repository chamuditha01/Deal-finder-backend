const express = require('express');
const axios = require('axios');
const app = express();
const port = 5000;

// Replace with your actual CoinMarketCap API key
const CMC_API_KEY = 'e895d238-4dc7-48a3-8ea7-6f4489147266'; // Replace this!

// 5 Coins and 5 Exchanges as platforms
const coins = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP'];
const platforms = ['binance', 'coinbase', 'bybit', 'kraken', 'okx']; // Updated to exchanges

// Store all price data
let priceData = {};

const fetchPricesForPlatform = async (platform) => {
  try {
    const response = await axios.get('https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest', {
      params: {
        symbol: coins.join(','), // Fetch all 5 coins
        convert: 'USD', // Single convert option to comply with free tier
      },
      headers: {
        'X-CMC_PRO_API_KEY': CMC_API_KEY,
        'Accept': 'application/json',
      },
    });

    const data = response.data.data;
    priceData[platform] = data; // Store data by platform (exchange)
    console.log(`\nSuccessfully fetched prices for ${platform} at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}:`);
    coins.forEach(coin => {
      const price = data[coin]?.[0]?.quote['USD']?.price; // Use USD as base
      if (price) {
        console.log(`${coin}: $${price.toFixed(2)}`); // Log as if from the exchange
      } else {
        console.log(`${coin}: Not available`);
      }
    });
  } catch (error) {
    console.error(`Error fetching prices for ${platform} at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
};

// Endpoint to fetch and log prices
app.get('/fetch-prices', async (req, res) => {
  console.log('Fetching prices...');
  console.log('API Key:', CMC_API_KEY ? 'Set' : 'Not Set');
  console.log('Coins:', coins);
  console.log('Platforms (Exchanges):', platforms);

  if (!CMC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  priceData = {}; // Reset price data
  for (const platform of platforms) {
    await fetchPricesForPlatform(platform); // Sequential calls
  }

  res.json({ message: 'Prices fetched and logged successfully', data: priceData });
});

// Start the server
app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});