# Smart Travel Planner

A full-stack travel planning application that combines a self-developed RESTful API with third-party API integrations to help users plan trips, track budgets, view live weather, and discover nearby attractions.

Built with Node.js/Express (backend), React (frontend), and MongoDB (database).

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup and Installation](#setup-and-installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Functional Requirements Fulfilment](#functional-requirements-fulfilment)
- [Security Implementation](#security-implementation)
- [Third-Party API Integration](#third-party-api-integration)
- [Non-Functional Requirements](#non-functional-requirements)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router, Vite |
| Backend | Node.js, Express 5 |
| Database | MongoDB (native driver) |
| Authentication | JWT (JSON Web Tokens), bcrypt |
| Security | Helmet, CORS, HPP, express-rate-limit, RBAC, API Key generation |
| External APIs | OpenWeatherMap, SerpAPI (Google Places + Directions), OSRM, ExchangeRatesAPI |

---

## Project Structure

```
travel-planner/
├── backend/
│   ├── api_routes/
│   │   ├── authRoutes.js       # POST /register, POST /login, POST /refresh-api-key
│   │   ├── tripRoutes.js       # CRUD /api/trips + admin route
│   │   ├── stopRoutes.js       # CRUD /api/trips/:id/stops, /api/stops/:id
│   │   ├── budgetRoutes.js     # POST, GET, DELETE /api/budget
│   │   ├── weatherRoutes.js    # GET /api/weather/:city (proxy)
│   │   ├── placesRoutes.js     # GET /api/places/search, /api/places/directions (SerpAPI proxy)
│   │   └── routingRoutes.js    # POST /api/routing/directions, /api/routing/multi (OSRM proxy)
│   ├── config/
│   │   └── db.js               # MongoDB connection
│   ├── middleware/
│   │   ├── auth.js             # JWT verification middleware
│   │   ├── apiKey.js           # API key generation (crypto) and validation middleware
│   │   ├── rateLimiter.js      # Rate limiting (general + auth-specific)
│   │   └── rbac.js             # Role-based access control
│   ├── services/
│   │   ├── weather.js          # OpenWeatherMap client
│   │   ├── serpapi.js          # SerpAPI client (Google Places + Directions)
│   │   ├── routing.js          # OSRM routing client
│   │   └── exchangeRate.js     # ExchangeRatesAPI client
│   ├── server.js               # Express app entry point
│   ├── .env.example            # Environment variable template
│   ├── .gitignore
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Global auth state (JWT storage)
│   │   ├── services/
│   │   │   └── api.js              # Centralized HTTP client with auth headers
│   │   ├── App.jsx                 # Router guard and page routing
│   │   ├── signIn.jsx              # Login/Register page
│   │   ├── home.jsx                # Dashboard with trip list and weather
│   │   ├── addTrip.jsx             # Trip creation form
│   │   ├── editTrip.jsx            # Trip editing form + delete
│   │   └── planView.jsx            # Journey view with timeline, budget, and nearby places
│   ├── vite.config.js              # Vite config with API proxy
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
└── README.md
```

---

## Prerequisites

- Node.js v20.19+ or v22.12+ (required by Vite 8)
- MongoDB (local instance or MongoDB Atlas)
- npm (comes with Node.js)
- API keys for: OpenWeatherMap, ExchangeRatesAPI.io, SerpAPI

---

## Setup and Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd travel-planner
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 4. Configure environment variables

Create a `.env` file in the `backend/` directory using the template:

```bash
cp backend/.env.example backend/.env
```

Then fill in the values (see Environment Variables section below).

---

## Environment Variables

Create `backend/.env` with the following:

```
PORT=5000
NODE_ENV=development

MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/travel_app?retryWrites=true&w=majority

JWT_SECRET=<generate-a-random-64-byte-hex-string>

CORS_ORIGIN=http://localhost:5173

OPENWEATHER_API_KEY=<your-openweathermap-api-key>
EXCHANGE_RATE_API_KEY=<your-exchangeratesapi-io-key>
SERPAPI_KEY=<your-serpapi-key>
```

To generate a JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Where to get API keys:
- OpenWeatherMap: https://openweathermap.org/api
- ExchangeRatesAPI: https://manage.exchangeratesapi.io/dashboard
- SerpAPI: https://serpapi.com/manage-api-key

---

## Running the Application

### Start the backend server

```bash
cd backend
npm start
```

The server will start on http://localhost:5000.

### Start the frontend development server

In a separate terminal:

```bash
cd frontend
npm run dev
```

The frontend will start on http://localhost:5173. The Vite proxy automatically forwards `/api` requests to the backend.

### Verify the setup

Open http://localhost:5173 in your browser. You should see the landing page. Click "Get Started" to access the sign-in page.

You can also verify the backend independently:

```bash
curl http://localhost:5000/api/health
```

Expected response: `{"status":"ok","timestamp":"..."}`

---

## API Documentation

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create a new user account |
| POST | /api/auth/login | Authenticate and receive JWT token |
| POST | /api/auth/refresh-api-key | Regenerate API key (requires auth) |

### Trips (Self-Developed CRUD API)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/trips | Create a new trip |
| GET | /api/trips | Get all trips with aggregated metrics |
| GET | /api/trips/:id | Get a single trip by ID |
| PUT | /api/trips/:id | Update a trip |
| DELETE | /api/trips/:id | Delete a trip (cascades to stops and expenses) |
| GET | /api/trips/admin/all | Admin-only: get all trips across all users |

### Journey Planner (Stops)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/trips/:tripId/stops | Add a stop to a trip |
| GET | /api/trips/:tripId/stops | Get all stops for a trip |
| PUT | /api/stops/:id | Update a stop |
| DELETE | /api/stops/:id | Delete a stop |

### Budget (Expenses)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/budget | Add an expense (with auto currency conversion) |
| GET | /api/budget/:tripId | Get all expenses and budget summary |
| DELETE | /api/budget/:id | Delete an expense |

### Weather (Third-Party Proxy)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/weather/:city | Get live weather for a city |

### Places and Directions (Third-Party Proxy via SerpAPI)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/places/search | Search nearby attractions, restaurants, hotels |
| GET | /api/places/directions | Get directions between two locations |

### Routing (Third-Party Proxy via OSRM)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/routing/directions | Get route between two coordinates |
| POST | /api/routing/multi | Get route between multiple waypoints |

All endpoints except /api/auth/register, /api/auth/login, and /api/health require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## Functional Requirements Fulfilment

### Part A: Self-Developed API

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| User travel records (destinations, notes, preferences) | Fulfilled | Trips collection stores destination, notes, travel preferences, budget, dates, hotel details |
| CRUD operations | Fulfilled | Full Create, Read, Update, Delete on trips, stops, and expenses |
| Data storage using a database | Fulfilled | MongoDB with collections: users, trips, stops, expenses, api_keys |
| JSON-based request and response format | Fulfilled | All endpoints accept and return JSON |
| Minimum endpoints (POST, GET, PUT, DELETE /api/trips) | Fulfilled | All four methods implemented plus additional endpoints |
| Authentication using JWT (optional) | Fulfilled | JWT-based auth with token expiry, role claims, and refresh |

### Part B: Third-Party API Integration

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Integrate at least one external API | Fulfilled | Four external APIs integrated (OpenWeatherMap, SerpAPI, OSRM, ExchangeRatesAPI) |
| Fetch real-time data | Fulfilled | Live weather, live place search, real-time routing, live exchange rates |
| Handle API errors (invalid key, rate limits, network failure) | Fulfilled | Try/catch blocks, status code checks, meaningful error messages, fallback handling |
| Parse and display meaningful results | Fulfilled | Raw API responses are cleaned and structured before returning to the client |

### Part C: Application Layer

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Web-based interface | Fulfilled | React SPA with multiple pages (landing, sign-in, dashboard, add trip, edit trip, journey view) |
| Accept user input | Fulfilled | Sign-in/sign-up forms, trip creation/edit form, expense form, places search |
| Combine data from self-developed and third-party API | Fulfilled | Dashboard shows user trips alongside live weather; journey view shows stops with nearby places discovery and budget tracking with currency conversion |
| Display results clearly | Fulfilled | Stat cards, trip lists with filters, weather widgets, timeline view, budget progress bar, places search grid |

---

## Security Implementation

| Feature | Description |
|---------|-------------|
| Password Hashing | bcrypt with configurable salt rounds (default: 10) |
| JWT Authentication | Signed tokens with expiry (7 days), includes user role for RBAC |
| API Key Generation | Cryptographically secure keys using crypto.randomBytes(32), stored with 30-day expiry |
| Rate Limiting | General: 100 req/15min; Auth: 10 req/15min; Weather: 30 req/15min; Places: 30 req/15min; Routing: 20 req/15min |
| Secure Headers | Helmet middleware sets X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, etc. |
| CORS | Configurable allowed origins, methods, and headers |
| HPP | HTTP Parameter Pollution protection |
| RBAC | Role-based access control (user, moderator, admin) with authorize() middleware |
| Input Validation | All endpoints validate required fields, data types, and value ranges |
| Body Size Limit | express.json limited to 10kb to prevent payload attacks |
| Cascade Delete | Deleting a trip removes all associated stops and expenses |
| Token Expiry Handling | Frontend detects expired tokens and forces re-authentication |
| API Key Expiry | Keys auto-expire after 30 days; expired keys are deactivated on use |
| Secure API Key Storage | All third-party keys stored in .env (gitignored), accessed only server-side via proxy routes |

---

## Third-Party API Integration

### OpenWeatherMap
- Provides live weather data for any city
- Used on the dashboard (right column) and journey view (hero banner)
- Accessed via backend proxy to keep API key server-side
- Endpoint: GET /api/weather/:city

### SerpAPI (Google Places + Google Maps Directions)
- Searches nearby attractions, restaurants, and hotels via Google Places
- Provides directions and travel time between locations via Google Maps Directions
- Used on the journey page "Discover Nearby Places" panel
- Users can search and add places directly as stops to their itinerary
- Endpoints: GET /api/places/search, GET /api/places/directions

### Open Source Routing Machine (OSRM)
- Computes driving/walking/cycling routes between coordinates
- Returns distance (km) and duration (minutes) for each leg
- Supports multi-stop route calculation
- No API key required (free public demo server)
- Endpoints: POST /api/routing/directions, POST /api/routing/multi

### ExchangeRatesAPI.io
- Converts expense amounts between currencies automatically
- Triggered when logging an expense in a currency different from the trip base currency
- Shows original amount, converted amount, and conversion rate in the expense list
- Endpoint: Used internally by POST /api/budget

---

## Non-Functional Requirements

| Requirement | How it is met |
|-------------|---------------|
| Clear and readable code structure | Modular architecture: routes, middleware, services, and config are separated into distinct directories |
| Proper error handling | Try/catch on all async operations, meaningful HTTP status codes, no stack traces leaked to clients, 404 handler, global error handler |
| Meaningful variable and function names | Descriptive names throughout (e.g., generateApiKeyWithExpiry, authMiddleware, convertCurrency, handleAddPlaceAsStop) |
| Secure handling of API keys | All keys stored in .env file (gitignored), never exposed to the frontend; third-party calls go through backend proxies |

---

## Testing

Backend endpoints can be tested using Postman or any HTTP client. Example workflow:

1. Register: POST http://localhost:5000/api/auth/register
   ```json
   { "name": "John", "email": "john@example.com", "password": "password123" }
   ```

2. Login: POST http://localhost:5000/api/auth/login
   ```json
   { "email": "john@example.com", "password": "password123" }
   ```

3. Create trip: POST http://localhost:5000/api/trips (with Bearer token)
   ```json
   { "destination": "Tokyo", "tripName": "Japan Trip", "startDate": "2025-07-12", "endDate": "2025-07-20", "budget": 5000, "currency": "USD" }
   ```

4. Get trips: GET http://localhost:5000/api/trips (with Bearer token)

5. Get weather: GET http://localhost:5000/api/weather/Tokyo (with Bearer token)

6. Search places: GET http://localhost:5000/api/places/search?query=restaurant&near=Tokyo (with Bearer token)

7. Get directions: GET http://localhost:5000/api/places/directions?origin=Shinjuku&destination=Shibuya&mode=walking (with Bearer token)

8. Add expense: POST http://localhost:5000/api/budget (with Bearer token)
   ```json
   { "tripId": "<trip_id>", "amount": 1500, "currency": "JPY", "category": "Food", "notes": "Ramen dinner" }
   ```

---

## Authors

6005CMD Web API Development - Group Project
