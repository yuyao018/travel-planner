# Travel Planner

A full-stack travel planning web application that lets users create and manage trips, build day-by-day itineraries, track budgets, check live weather, and visualise routes on an interactive map. An AI assistant (Google Gemini) can generate a complete itinerary from a trip's details in one click.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Trips](#trips)
  - [Stops (Itinerary)](#stops-itinerary)
  - [Budget & Expenses](#budget--expenses)
  - [Weather](#weather)
  - [Routing (OSRM)](#routing-osrm)
  - [Places (SerpAPI)](#places-serpapi)
  - [AI Itinerary Generation](#ai-itinerary-generation)
  - [Health Check](#health-check)
- [Security](#security)
- [Database](#database)

---

## Features

- **Trip management** — Create, edit, and delete trips with destination, dates, budget, airport and hotel details, and travel preferences.
- **Itinerary planner** — Add, edit, and delete daily stops with time, category, duration, location, and GPS coordinates.
- **AI itinerary generation** — One-click generation of a full, geographically-clustered itinerary via Google Gemini, with automatic geocoding via Nominatim.
- **Interactive map** — Visualise stop locations and routes on a Leaflet map.
- **Budget tracker** — Log expenses per trip with automatic currency conversion (ExchangeRatesAPI.io). See remaining budget at a glance.
- **Live weather** — Fetch current weather for any city via an OpenWeatherMap proxy.
- **Route calculation** — Compute driving, walking, or cycling routes between stops using the free OSRM demo server.
- **Places search** — Search for nearby places (restaurants, attractions, etc.) and get text-based directions via Google Maps through SerpAPI.
- **Authentication** — JWT-based login and registration. API keys with 30-day expiry are also issued per user.
- **Role-based access control** — `user`, `moderator`, and `admin` roles with admin-only endpoints.
- **Dashboard metrics** — Total trips, upcoming trips, and distinct destinations shown on the home screen.

---

## Tech Stack

### Backend
| Package | Version | Purpose |
|---|---|---|
| Node.js + Express | ^5.2.1 | HTTP server |
| MongoDB (native driver) | ^7.2.0 | Database |
| jsonwebtoken | ^9.0.3 | JWT auth |
| bcryptjs | ^3.0.3 | Password hashing |
| helmet | ^8.1.0 | Secure HTTP headers |
| cors | ^2.8.6 | CORS policy |
| hpp | ^0.2.3 | HTTP Parameter Pollution protection |
| express-rate-limit | ^8.5.2 | Rate limiting |
| @google/generative-ai | ^0.24.1 | Gemini AI itinerary generation |
| dotenv | ^17.4.2 | Environment variables |

### Frontend
| Package | Version | Purpose |
|---|---|---|
| React | ^19.2.6 | UI framework |
| Vite | ^5.4.21 | Build tool / dev server |
| React Router DOM | ^7.15.1 | Routing |
| Leaflet + react-leaflet | ^1.9.4 / ^5.0.0 | Interactive maps |

### External APIs
| Service | Used for |
|---|---|
| [OpenWeatherMap](https://openweathermap.org/api) | Live weather data |
| [ExchangeRatesAPI.io](https://exchangeratesapi.io/) | Currency conversion |
| [SerpAPI](https://serpapi.com/) | Google Places search & directions |
| [OSRM](http://project-osrm.org/) | Open-source routing (free, no key needed) |
| [Nominatim](https://nominatim.org/) | Geocoding for AI-generated stops (free) |
| [Google Gemini](https://ai.google.dev/) | AI itinerary generation |

---

## Project Structure

```
llm_testing/
├── backend/
│   ├── api_routes/
│   │   ├── authRoutes.js       # Register, login, refresh API key
│   │   ├── tripRoutes.js       # CRUD for trips + admin endpoint
│   │   ├── stopRoutes.js       # CRUD for itinerary stops
│   │   ├── budgetRoutes.js     # Expense tracking with currency conversion
│   │   ├── weatherRoutes.js    # OpenWeatherMap proxy
│   │   ├── routingRoutes.js    # OSRM route calculation
│   │   ├── placesRoutes.js     # SerpAPI places search & directions
│   │   └── aiRoutes.js         # Gemini AI itinerary generation
│   ├── config/
│   │   └── db.js               # MongoDB connection pool
│   ├── middleware/
│   │   ├── auth.js             # JWT verification
│   │   ├── apiKey.js           # API key generation & validation
│   │   ├── rateLimiter.js      # General & auth-specific rate limiters
│   │   └── rbac.js             # Role-based access control
│   ├── services/
│   │   ├── aiService.js        # Gemini API wrapper
│   │   ├── weather.js          # OpenWeatherMap API wrapper
│   │   ├── exchangeRate.js     # ExchangeRatesAPI.io wrapper
│   │   ├── routing.js          # OSRM API wrapper
│   │   └── serpapi.js          # SerpAPI wrapper
│   ├── server.js               # Express app entry point
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── RouteMap.jsx    # Leaflet map component
    │   ├── context/
    │   │   └── AuthContext.jsx # Global auth state (JWT + localStorage)
    │   ├── services/
    │   │   └── api.js          # Centralised HTTP client with auth injection
    │   ├── App.jsx             # Root component & state-based router
    │   ├── home.jsx            # Dashboard — trip list & metrics
    │   ├── addTrip.jsx         # Create trip form
    │   ├── editTrip.jsx        # Edit trip form
    │   ├── planView.jsx        # Itinerary, map, budget & weather view
    │   └── signIn.jsx          # Login & registration
    ├── .env.example
    └── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A MongoDB Atlas cluster (or local MongoDB instance)
- API keys for the external services you want to use (see [Environment Variables](#environment-variables))

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in your values in .env
npm start
```

The server starts on `http://localhost:5000` by default.

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL if needed (leave empty to use Vite's dev proxy)
npm run dev
```

The app opens on `http://localhost:5173` by default.

> **Vite proxy:** In development, the frontend proxies `/api` requests to the backend automatically, so you don't need to set `VITE_API_URL` unless you're using a different backend port or a deployed URL.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: `5000`) |
| `NODE_ENV` | No | `development` or `production` |
| `MONGO_URI` | **Yes** | MongoDB connection string |
| `JWT_SECRET` | **Yes** | Secret used to sign JWT tokens |
| `CORS_ORIGIN` | No | Allowed frontend origin (default: `*`) |
| `OPENWEATHER_API_KEY` | For weather | [OpenWeatherMap](https://openweathermap.org/api) API key |
| `EXCHANGE_RATE_API_KEY` | For budget conversion | [ExchangeRatesAPI.io](https://exchangeratesapi.io/) API key |
| `SERPAPI_KEY` | For places search | [SerpAPI](https://serpapi.com/) API key |
| `GEMINI_API_KEY` | For AI generation | [Google AI Studio](https://ai.google.dev/) API key |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | No | Backend API base URL (default: `/api`) |

---

## API Reference

All endpoints are prefixed with `/api`. All endpoints except `/api/auth/*` and `/api/health` require a valid JWT Bearer token:

```
Authorization: Bearer <token>
```

### Authentication

Rate limited to **10 requests per 15 minutes** per IP.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | No | Create an account. Returns a JWT and an API key. |
| `POST` | `/auth/login` | No | Login. Returns a JWT. |
| `POST` | `/auth/refresh-api-key` | JWT | Invalidate the current API key and issue a new one (30-day expiry). |

**Register request body:**
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "secret123"
}
```

**Register / Login response:**
```json
{
  "token": "<jwt>",
  "apiKey": "<hex-key>",
  "apiKeyExpiresAt": "2026-07-03T00:00:00.000Z",
  "user": { "id": "...", "name": "Alice", "email": "alice@example.com", "role": "user" }
}
```

---

### Trips

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/trips` | JWT | Create a new trip. |
| `GET` | `/trips` | JWT | Get all trips for the current user + dashboard metrics. |
| `GET` | `/trips/:id` | JWT | Get a single trip by ID. |
| `PUT` | `/trips/:id` | JWT | Update a trip. |
| `DELETE` | `/trips/:id` | JWT | Delete a trip and cascade-delete all its stops and expenses. |
| `GET` | `/trips/admin/all` | JWT + Admin | Get all trips across all users. |

**Create / Update trip body (all optional except where noted):**
```json
{
  "tripName": "Japan Spring 2026",       // required
  "destination": "Tokyo, Japan",         // required
  "startDate": "2026-03-01",             // required
  "endDate": "2026-03-10",               // required
  "budget": 3000,
  "currency": "USD",
  "arrivalAirport": "NRT",
  "departureAirport": "LHR",
  "arrivalAirportLat": 35.764,
  "arrivalAirportLng": 140.386,
  "departureAirportLat": 51.477,
  "departureAirportLng": -0.461,
  "arrivalTime": "2026-03-01T10:00:00Z",
  "departureTime": "2026-03-10T20:00:00Z",
  "hotelLocation": "Shinjuku, Tokyo",
  "hotelLat": 35.689,
  "hotelLng": 139.691,
  "hotelCheckIn": "2026-03-01",
  "hotelCheckOut": "2026-03-10",
  "travelPreferences": ["Culture", "Food"],
  "notes": "Prefer vegetarian options"
}
```

**GET /trips response:**
```json
{
  "metrics": {
    "totalPlannedTrips": 3,
    "upcomingTrips": 2,
    "countriesPlanned": 2
  },
  "trips": [ ... ]
}
```

---

### Stops (Itinerary)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/trips/:tripId/stops` | JWT | Add a stop to a trip. |
| `GET` | `/trips/:tripId/stops` | JWT | Get all stops for a trip, sorted by day → time → order. |
| `PUT` | `/stops/:id` | JWT | Update a stop. |
| `DELETE` | `/stops/:id` | JWT | Delete a stop. |

**Stop body:**
```json
{
  "day": 1,                         // required
  "activityTitle": "Senso-ji Temple", // required
  "time": "09:00",
  "location": "2-3-1 Asakusa, Tokyo",
  "category": "Culture",
  "duration": "2h",
  "notes": "Arrive early to avoid crowds",
  "order": 1,
  "lat": 35.714,
  "lng": 139.796
}
```

**Categories:** `Food`, `Sightseeing`, `Logistics`, `Shopping`, `Transport`, `Adventure`, `Culture`, `General`

---

### Budget & Expenses

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/budget` | JWT | Add an expense. Converts to the trip's base currency automatically. |
| `GET` | `/budget/:tripId` | JWT | Get all expenses for a trip + spending summary. |
| `DELETE` | `/budget/:id` | JWT | Delete an expense. |

**Add expense body:**
```json
{
  "tripId": "<trip_id>",      // required
  "amount": 1500,             // required
  "category": "Food",         // required
  "currency": "JPY",
  "notes": "Ramen lunch"
}
```

**GET /budget/:tripId response:**
```json
{
  "expenses": [ ... ],
  "summary": {
    "totalSpent": 450.20,
    "totalBudget": 3000,
    "baseCurrency": "USD",
    "remaining": 2549.80
  }
}
```

> **Note:** Currency conversion uses ExchangeRatesAPI.io with EUR as the base (free plan limitation). Cross-rates are calculated automatically.

---

### Weather

Rate limited to **30 requests per 15 minutes** per IP.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/weather/:city` | JWT | Get current weather for a city. |

**Example:** `GET /api/weather/Tokyo`

**Response:**
```json
{
  "weather": {
    "city": "Tokyo",
    "country": "JP",
    "temperature": 18.5,
    "feelsLike": 17.2,
    "humidity": 65,
    "description": "few clouds",
    "icon": "02d",
    "windSpeed": 3.1,
    "visibility": 10000,
    "sunrise": "2026-03-01T21:00:00.000Z",
    "sunset": "2026-03-02T09:00:00.000Z"
  }
}
```

---

### Routing (OSRM)

Rate limited to **20 requests per 15 minutes** per IP. Uses the free [OSRM demo server](http://project-osrm.org/) — no API key required.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/routing/directions` | JWT | Get a route between two coordinate pairs. |
| `POST` | `/routing/multi` | JWT | Get a route through multiple waypoints (max 25). |

**POST /routing/directions body:**
```json
{
  "origin": { "lat": 35.714, "lng": 139.796 },
  "destination": { "lat": 35.689, "lng": 139.691 },
  "profile": "walking"
}
```

**Profiles:** `driving`, `walking`, `cycling`

**Response:**
```json
{
  "route": {
    "distance": { "meters": 3820, "km": 3.82 },
    "duration": { "seconds": 2760, "minutes": 46.0 },
    "geometry": { "type": "LineString", "coordinates": [ ... ] }
  }
}
```

**POST /routing/multi body:**
```json
{
  "waypoints": [
    { "lat": 35.714, "lng": 139.796 },
    { "lat": 35.700, "lng": 139.750 },
    { "lat": 35.689, "lng": 139.691 }
  ],
  "profile": "driving"
}
```

---

### Places (SerpAPI)

Rate limited to **30 requests per 15 minutes** per IP.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/places/search` | JWT | Search for places near a location via Google Maps. |
| `GET` | `/places/directions` | JWT | Get text-based directions via Google Maps. |

**GET /places/search query params:**
| Param | Required | Description |
|---|---|---|
| `query` | Yes | Search term, e.g. `ramen restaurant` |
| `near` | Yes | Location name, e.g. `Shinjuku, Tokyo` |
| `limit` | No | Number of results (1–20, default: 10) |

**Example:** `GET /api/places/search?query=temple&near=Kyoto,Japan&limit=5`

**GET /places/directions query params:**
| Param | Required | Description |
|---|---|---|
| `origin` | Yes | Starting address or place name |
| `destination` | Yes | Ending address or place name |
| `mode` | No | `driving` (default), `walking`, `transit`, `bicycling` |

---

### AI Itinerary Generation

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/ai/:tripId/generate-ai` | JWT | Generate a full day-by-day itinerary and save it as stops. |

This endpoint:
1. Sends the trip details (destination, duration, budget, preferences) to Google Gemini.
2. Receives a structured JSON array of stops with geographic clustering per day.
3. Geocodes each stop's location via Nominatim (1.1s delay between requests to comply with usage policy).
4. Clears existing stops for the trip and inserts the new ones.

> **Note:** Generation time varies based on trip duration and Nominatim geocoding delays. A 7-day trip may take 10–15 seconds.

**Response:**
```json
{
  "message": "Itinerary generated successfully.",
  "count": 28
}
```

---

### Health Check

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Returns server status and timestamp. |

---

## Security

The following security measures are applied:

- **Helmet** — Sets secure HTTP response headers (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `X-XSS-Protection`, etc.).
- **CORS** — Configurable allowed origins via `CORS_ORIGIN`. Restricts allowed methods and headers.
- **HPP** — Prevents HTTP Parameter Pollution attacks.
- **Body size limit** — JSON payloads capped at 10kb.
- **Rate limiting** — Global limit of 100 req/15min. Auth endpoints limited to 10 req/15min. Weather, places, and routing endpoints each have their own stricter limits.
- **JWT** — Tokens signed with `JWT_SECRET`, expire after 7 days. Verified on every protected route.
- **bcrypt** — Passwords hashed with 10 salt rounds before storage.
- **API keys** — Generated using `crypto.randomBytes(32)`, stored in MongoDB, expire after 30 days.
- **RBAC** — Role-based access control with `user`, `moderator`, and `admin` roles.
- **Input validation & sanitisation** — All route handlers validate required fields, check ID format, and sanitise inputs before processing.

---

## Database

MongoDB Atlas (`travel_app` database). The app connects via a persistent `MongoClient` pool over TLS.

**Collections:**

| Collection | Description |
|---|---|
| `users` | User accounts (`name`, `email`, `password` hash, `role`, `createdAt`) |
| `api_keys` | API keys per user (`key`, `userId`, `role`, `isActive`, `expiresAt`) |
| `trips` | Trip documents owned by `userId` |
| `stops` | Itinerary stops linked to `tripId` |
| `expenses` | Budget expenses linked to `tripId` |

Trip deletion cascades automatically to the `stops` and `expenses` collections.
