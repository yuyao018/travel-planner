/**
 * API Service Layer
 * Centralized HTTP client that attaches Authorization: Bearer <token>
 * to all outward API operations.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Get the stored JWT token from localStorage.
 */
function getToken() {
  return localStorage.getItem('token');
}

/**
 * HTTP request wrapper with automatic auth header injection.
 */
async function request(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Attach Bearer token to all requests if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle empty responses (204 No Content, etc.)
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = {};
  }

  // Only force sign-out on 401 from auth-related endpoints
  // Other 401s (e.g., third-party API key issues) should just throw an error
  if (response.status === 401 && endpoint.startsWith('/auth') === false) {
    // Check if it's actually a token issue vs a third-party service issue
    const isTokenIssue = data.message && (
      data.message.includes('token') ||
      data.message.includes('Access denied') ||
      data.message.includes('expired')
    );

    if (isTokenIssue) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }

    throw new Error(data.message || 'Authentication failed.');
  }

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
}

// ─── Auth API ────────────────────────────────────────────────────────────────

export const authAPI = {
  register: (name, email, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
};

// ─── Trips API ───────────────────────────────────────────────────────────────

export const tripsAPI = {
  getAll: () => request('/trips'),

  getOne: (id) => request(`/trips/${id}`),

  create: (tripData) =>
    request('/trips', {
      method: 'POST',
      body: JSON.stringify(tripData),
    }),

  update: (id, tripData) =>
    request(`/trips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tripData),
    }),

  delete: (id) =>
    request(`/trips/${id}`, { method: 'DELETE' }),
};

// ─── Stops (Journey Planner) API ─────────────────────────────────────────────

export const stopsAPI = {
  getAll: (tripId) => request(`/trips/${tripId}/stops`),

  create: (tripId, stopData) =>
    request(`/trips/${tripId}/stops`, {
      method: 'POST',
      body: JSON.stringify(stopData),
    }),

  update: (stopId, stopData) =>
    request(`/stops/${stopId}`, {
      method: 'PUT',
      body: JSON.stringify(stopData),
    }),

  delete: (stopId) =>
    request(`/stops/${stopId}`, { method: 'DELETE' }),
};

// ─── Budget (Expenses) API ───────────────────────────────────────────────────

export const budgetAPI = {
  getExpenses: (tripId) => request(`/budget/${tripId}`),

  addExpense: (expenseData) =>
    request('/budget', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    }),

  deleteExpense: (id) =>
    request(`/budget/${id}`, { method: 'DELETE' }),
};

// ─── Weather API (via backend proxy) ─────────────────────────────────────────

export const weatherAPI = {
  getWeather: (city) => request(`/weather/${encodeURIComponent(city)}`),
};

// ─── Places (Google Places via SerpAPI) ──────────────────────────────────────

export const placesAPI = {
  searchByLocation: (query, near, limit = 10) =>
    request(`/places/search?query=${encodeURIComponent(query)}&near=${encodeURIComponent(near)}&limit=${limit}`),

  getDirections: (origin, destination, mode = 'driving') =>
    request(`/places/directions?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${mode}`),
};

// ─── Routing (OSRM) API ─────────────────────────────────────────────────────

export const routingAPI = {
  getDirections: (origin, destination, profile = 'driving') =>
    request('/routing/directions', {
      method: 'POST',
      body: JSON.stringify({ origin, destination, profile }),
    }),

  getMultiStopRoute: (waypoints, profile = 'driving') =>
    request('/routing/multi', {
      method: 'POST',
      body: JSON.stringify({ waypoints, profile }),
    }),
};
