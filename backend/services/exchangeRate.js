/**
 * ExchangeRatesAPI.io Service
 * https://manage.exchangeratesapi.io/dashboard
 * Uses the exchangeratesapi.io endpoint for currency conversion.
 */

const BASE_URL = 'https://api.exchangeratesapi.io/v1';

/**
 * Convert an amount from one currency to another.
 * @param {string} from - Source currency code (e.g., 'JPY')
 * @param {string} to - Target currency code (e.g., 'USD')
 * @param {number} amount - Amount to convert
 * @returns {Promise<{convertedAmount: number, rate: number}>}
 */
async function convertCurrency(from, to, amount) {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  if (!apiKey) {
    throw new Error('Exchange rate API key not configured.');
  }

  // exchangeratesapi.io /convert endpoint
  const url = `${BASE_URL}/convert?access_key=${apiKey}&from=${from}&to=${to}&amount=${amount}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Exchange rate API returned status ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error?.info || 'Exchange rate API request failed.');
  }

  return {
    convertedAmount: parseFloat(data.result.toFixed(2)),
    rate: data.info.rate,
  };
}

/**
 * Get latest exchange rates for a base currency.
 * @param {string} base - Base currency code (e.g., 'USD')
 * @param {string[]} symbols - Array of target currency codes (optional)
 * @returns {Promise<object>} Rates object
 */
async function getLatestRates(base, symbols = []) {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  if (!apiKey) {
    throw new Error('Exchange rate API key not configured.');
  }

  let url = `${BASE_URL}/latest?access_key=${apiKey}&base=${base}`;

  if (symbols.length > 0) {
    url += `&symbols=${symbols.join(',')}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Exchange rate API returned status ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error?.info || 'Exchange rate API request failed.');
  }

  return {
    base: data.base,
    date: data.date,
    rates: data.rates,
  };
}

module.exports = { convertCurrency, getLatestRates };
