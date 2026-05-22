/**
 * ExchangeRatesAPI.io Service
 * https://manage.exchangeratesapi.io/dashboard
 * Uses the exchangeratesapi.io endpoint for currency conversion.
 */

const BASE_URL = 'https://api.exchangeratesapi.io/v1';

/**
 * Convert an amount from one currency to another.
 * Handles Free Plan limitation (EUR base only, no /convert endpoint)
 * by fetching latest rates and calculating cross-rates.
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

  // Use /latest instead of /convert because /convert is a paid feature.
  // Free plan only supports EUR as base.
  const url = `${BASE_URL}/latest?access_key=${apiKey}&symbols=${from},${to}`;

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Exchange rate API access forbidden. Your API key might not support this feature or has reached its limit.');
    }
    if (response.status === 401) {
      throw new Error('Invalid Exchange rate API key.');
    }
    throw new Error(`Exchange rate API returned status ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error?.info || 'Exchange rate API request failed.');
  }

  const rates = data.rates;
  
  if (!rates[from] || !rates[to]) {
    throw new Error(`Currency rate for ${!rates[from] ? from : to} not found.`);
  }

  // Cross-rate calculation:
  // JPY -> USD = (EUR -> USD) / (EUR -> JPY)
  const rate = rates[to] / rates[from];
  const convertedAmount = amount * rate;

  return {
    convertedAmount: parseFloat(convertedAmount.toFixed(2)),
    rate: parseFloat(rate.toFixed(6)),
  };
}

/**
 * Get latest exchange rates for a base currency.
 * Note: Free Plan only supports EUR as base. If base is not EUR,
 * this function will fetch rates relative to EUR and convert them.
 * @param {string} base - Base currency code (e.g., 'USD')
 * @param {string[]} symbols - Array of target currency codes (optional)
 * @returns {Promise<object>} Rates object
 */
async function getLatestRates(base, symbols = []) {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  if (!apiKey) {
    throw new Error('Exchange rate API key not configured.');
  }

  // Always use base=EUR for Free Plan compatibility
  let url = `${BASE_URL}/latest?access_key=${apiKey}&base=EUR`;

  // If we need specific symbols, we must include the requested base currency
  // so we can calculate the cross-rates.
  if (symbols.length > 0) {
    const allSymbols = new Set([...symbols, base]);
    url += `&symbols=${Array.from(allSymbols).join(',')}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Exchange rate API access forbidden. Base currency changes are often a paid feature.');
    }
    throw new Error(`Exchange rate API returned status ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error?.info || 'Exchange rate API request failed.');
  }

  // If base was already EUR, return as is
  if (base === 'EUR') {
    return {
      base: data.base,
      date: data.date,
      rates: data.rates,
    };
  }

  // Otherwise, calculate rates relative to the requested base
  const eurToBaseRate = data.rates[base];
  if (!eurToBaseRate) {
    throw new Error(`Base currency ${base} not found in rates.`);
  }

  const convertedRates = {};
  for (const [symbol, rate] of Object.entries(data.rates)) {
    convertedRates[symbol] = parseFloat((rate / eurToBaseRate).toFixed(6));
  }

  return {
    base,
    date: data.date,
    rates: convertedRates,
  };
}

module.exports = { convertCurrency, getLatestRates };
