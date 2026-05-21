/**
 * OpenWeatherMap API Service
 * Provides live weather data for any city.
 */

/**
 * Fetch current weather for a given city.
 * @param {string} city - City name (e.g., 'Tokyo')
 * @returns {Promise<object>} Cleaned weather data
 */
async function getWeather(city) {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    throw new Error('OpenWeatherMap API key not configured.');
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`City "${city}" not found.`);
    }
    throw new Error(`Weather API returned status ${response.status}`);
  }

  const data = await response.json();

  // Return clean, structured weather data
  return {
    city: data.name,
    country: data.sys.country,
    temperature: data.main.temp,
    feelsLike: data.main.feels_like,
    humidity: data.main.humidity,
    description: data.weather[0].description,
    icon: data.weather[0].icon,
    windSpeed: data.wind.speed,
    visibility: data.visibility,
    sunrise: new Date(data.sys.sunrise * 1000).toISOString(),
    sunset: new Date(data.sys.sunset * 1000).toISOString(),
  };
}

module.exports = { getWeather };
