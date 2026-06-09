/**
 * Open Source Routing Machine (OSRM) Service
 * Computes real-world driving/walking travel times and distances between stops.
 * Uses the free OSRM demo server.
 */

/**
 * Get route information between two coordinates.
 * @param {object} origin - { lat, lng }
 * @param {object} destination - { lat, lng }
 * @param {string} profile - 'driving' | 'walking' | 'cycling' (default: 'driving')
 * @returns {Promise<object>} Route data with distance and duration
 */
async function getRoute(origin, destination, profile = 'driving') {
  const validProfiles = ['driving', 'walking', 'cycling'];
  if (!validProfiles.includes(profile)) {
    throw new Error(`Invalid profile. Must be one of: ${validProfiles.join(', ')}`);
  }

  // The public OSRM demo exposes each profile on its own subdomain:
  //   car     → router.project-osrm.org   (driving)
  //   foot    → routing.openstreetmap.de/routed-foot
  //   bicycle → routing.openstreetmap.de/routed-bike
  const profileMap = {
    driving: 'https://router.project-osrm.org/route/v1/driving',
    walking: 'https://routing.openstreetmap.de/routed-foot/route/v1/foot',
    cycling: 'https://routing.openstreetmap.de/routed-bike/route/v1/bike',
  };

  const baseUrl = profileMap[profile];
  // OSRM uses lng,lat format
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `${baseUrl}/${coordinates}?overview=full&geometries=geojson`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OSRM API returned status ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error('No route found between the given coordinates.');
  }

  const route = data.routes[0];

  return {
    distance: {
      meters: route.distance,
      km: parseFloat((route.distance / 1000).toFixed(2)),
    },
    duration: {
      seconds: route.duration,
      minutes: parseFloat((route.duration / 60).toFixed(1)),
    },
    geometry: route.geometry,
  };
}

/**
 * Get route between multiple waypoints.
 * @param {Array<{lat: number, lng: number}>} waypoints - Array of coordinate objects
 * @param {string} profile - 'driving' | 'walking' | 'cycling'
 * @returns {Promise<object>} Full route data with legs
 */
async function getMultiStopRoute(waypoints, profile = 'driving') {
  if (!waypoints || waypoints.length < 2) {
    throw new Error('At least two waypoints are required.');
  }

  const profileMap = {
    driving: 'https://router.project-osrm.org/route/v1/driving',
    walking: 'https://routing.openstreetmap.de/routed-foot/route/v1/foot',
    cycling: 'https://routing.openstreetmap.de/routed-bike/route/v1/bike',
  };

  const baseUrl = profileMap[profile] || profileMap.driving;
  const coordinates = waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');
  const url = `${baseUrl}/${coordinates}?overview=full&geometries=geojson&steps=true`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OSRM API returned status ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error('No route found for the given waypoints.');
  }

  const route = data.routes[0];

  return {
    totalDistance: {
      meters: route.distance,
      km: parseFloat((route.distance / 1000).toFixed(2)),
    },
    totalDuration: {
      seconds: route.duration,
      minutes: parseFloat((route.duration / 60).toFixed(1)),
    },
    legs: route.legs.map((leg, index) => ({
      from: waypoints[index],
      to: waypoints[index + 1],
      distance: {
        meters: leg.distance,
        km: parseFloat((leg.distance / 1000).toFixed(2)),
      },
      duration: {
        seconds: leg.duration,
        minutes: parseFloat((leg.duration / 60).toFixed(1)),
      },
    })),
    geometry: route.geometry,
  };
}

module.exports = { getRoute, getMultiStopRoute };
