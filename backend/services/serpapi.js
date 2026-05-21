/**
 * SerpAPI Service
 * https://serpapi.com/
 * Provides Google Places and Google Maps Directions data.
 */

const BASE_URL = 'https://serpapi.com/search.json';

/**
 * Search for nearby places using Google Places via SerpAPI.
 * @param {object} params
 * @param {string} params.query - Search term (e.g., 'restaurant', 'temple')
 * @param {string} params.location - Location name (e.g., 'Tokyo, Japan')
 * @param {number} [params.limit=10] - Number of results
 * @returns {Promise<Array>} Array of place objects
 */
async function searchPlaces({ query, location, limit = 10 }) {
  const apiKey = process.env.SERPAPI_KEY;

  if (!apiKey) {
    throw new Error('SerpAPI key not configured.');
  }

  const params = new URLSearchParams({
    engine: 'google_maps',
    q: query,
    ll: `@${location}`,
    type: 'search',
    api_key: apiKey,
  });

  // If location is a name (not coordinates), use the 'q' param with location context
  const searchQuery = `${query} in ${location}`;
  params.set('q', searchQuery);
  params.delete('ll');

  const response = await fetch(`${BASE_URL}?${params.toString()}`);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid SerpAPI key.');
    }
    throw new Error(`SerpAPI returned status ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  const results = data.local_results || [];

  return results.slice(0, limit).map(place => ({
    id: place.place_id || place.data_id || '',
    name: place.title || '',
    categories: place.type ? [{ name: place.type }] : [],
    address: place.address || '',
    rating: place.rating || null,
    reviews: place.reviews || null,
    distance: null,
    lat: place.gps_coordinates?.latitude || null,
    lng: place.gps_coordinates?.longitude || null,
    thumbnail: place.thumbnail || null,
  }));
}

/**
 * Get directions between two locations using Google Directions via SerpAPI.
 * @param {string} origin - Origin address or place name
 * @param {string} destination - Destination address or place name
 * @param {string} [mode='driving'] - Travel mode: driving, walking, transit, bicycling
 * @returns {Promise<object>} Directions data
 */
async function getDirections(origin, destination, mode = 'driving') {
  const apiKey = process.env.SERPAPI_KEY;

  if (!apiKey) {
    throw new Error('SerpAPI key not configured.');
  }

  const validModes = ['driving', 'walking', 'transit', 'bicycling'];
  if (!validModes.includes(mode)) {
    throw new Error(`Invalid travel mode. Must be one of: ${validModes.join(', ')}`);
  }

  const params = new URLSearchParams({
    engine: 'google_maps_directions',
    start_addr: origin,
    end_addr: destination,
    travel_mode: mode === 'bicycling' ? '1' : mode === 'transit' ? '3' : mode === 'walking' ? '2' : '0',
    api_key: apiKey,
  });

  const response = await fetch(`${BASE_URL}?${params.toString()}`);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid SerpAPI key.');
    }
    throw new Error(`SerpAPI returned status ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  // Extract the best route
  const directions = data.directions || [];
  if (directions.length === 0) {
    throw new Error('No route found between the given locations.');
  }

  const bestRoute = directions[0];

  return {
    distance: bestRoute.distance || null,
    duration: bestRoute.duration || null,
    startAddress: data.start_address || origin,
    endAddress: data.end_address || destination,
    mode,
    steps: (bestRoute.steps || []).map(step => ({
      instruction: step.description || '',
      distance: step.distance || '',
      duration: step.duration || '',
    })),
  };
}

module.exports = { searchPlaces, getDirections };
