# Travel Planner App

A full-stack travel planning web application that lets users plan trips, manage itineraries, track budgets, discover nearby places, and generate AI-powered itineraries.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React-Leaflet, Leaflet.js |
| Backend | Node.js, Express 5 |
| Database | MongoDB (Atlas or local) |
| AI | Google Gemini API |
| Routing | OSRM (Open Source Routing Machine) |
| Weather | OpenWeatherMap API |
| Places | SerpAPI (Google Places) |
| Currency | ExchangeRate API |
| Auth | JWT (JSON Web Tokens) |
| Testing | Pytest + Selenium (frontend E2E), Jest + Supertest (backend) |

---

## Project Structure

```
llm_testing/
├── backend/
│   ├── api_routes/
│   │   ├── aiRoutes.js          # AI itinerary generation
│   │   ├── authRoutes.js        # Register / login
│   │   ├── budgetRoutes.js      # Expense tracking
│   │   ├── placesRoutes.js      # Nearby places search
│   │   ├── routingRoutes.js     # Route calculation (OSRM)
│   │   ├── stopRoutes.js        # Trip stops CRUD
│   │   ├── tripRoutes.js        # Trip CRUD
│   │   └── weatherRoutes.js     # Weather proxy
│   ├── config/
│   │   └── db.js                # MongoDB connection
│   ├── middleware/
│   │   ├── apiKey.js            # API key validation
│   │   ├── auth.js              # JWT authentication
│   │   ├── rateLimiter.js       # Rate limiting
│   │   └── rbac.js              # Role-based access control
│   ├── services/
│   │   ├── aiService.js         # Gemini AI integration
│   │   ├── exchangeRate.js      # Currency conversion
│   │   ├── routing.js           # OSRM routing service
│   │   ├── serpapi.js           # SerpAPI places search
│   │   └── weather.js           # OpenWeatherMap integration
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── RouteMap.jsx     # Interactive Leaflet map
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Auth state management
│   │   ├── services/
│   │   │   └── api.js           # Centralised API client
│   │   ├── addTrip.jsx          # Add trip form
│   │   ├── App.jsx              # Root component / page router
│   │   ├── editTrip.jsx         # Edit / delete trip form
│   │   ├── home.jsx             # Dashboard
│   │   ├── planView.jsx         # Trip plan view
│   │   └── signIn.jsx           # Login / register
│   ├── .env.example
│   └── package.json
└── tests/
    ├── conftest.py              # Pytest configuration
    └── test_frontend.py         # Selenium E2E tests
```

---

## Prerequisites

- Node.js 18+
- Python 3.10+ (for running Selenium tests)
- MongoDB Atlas account or local MongoDB instance
- Google Chrome + ChromeDriver (for Selenium tests)

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd llm_testing
```

### 2. Backend setup

```bash
cd backend
npm install
```

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/travel_app
JWT_SECRET=your_jwt_secret_here
CORS_ORIGIN=http://localhost:5173
OPENWEATHER_API_KEY=your_openweathermap_key
EXCHANGE_RATE_API_KEY=your_exchangerate_key
SERPAPI_KEY=your_serpapi_key
GEMINI_API_KEY=your_gemini_api_key
```

Start the backend:

```bash
npm start
```

The server runs on `http://localhost:5000`.

### 3. Frontend setup

```bash
cd frontend
npm install
```

Copy the example environment file:

```bash
cp .env.example .env
```

```env
# Leave empty to use Vite's proxy (recommended for development)
VITE_API_URL=
```

Start the frontend dev server:

```bash
npm run dev
```

The app runs on `http://localhost:5173`.

---

## API Reference

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login and receive JWT |
| POST | `/api/auth/refresh-api-key` | JWT | Refresh API key |

**Register body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "P@ssw0rd!"
}
```

**Login body:**
```json
{
  "email": "john@example.com",
  "password": "P@ssw0rd!"
}
```

---

### Trips

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/trips` | JWT | Get all trips for the logged-in user |
| POST | `/api/trips` | JWT | Create a new trip |
| GET | `/api/trips/:id` | JWT | Get a single trip |
| PUT | `/api/trips/:id` | JWT | Update a trip |
| DELETE | `/api/trips/:id` | JWT | Delete a trip and all its stops/expenses |
| GET | `/api/trips/admin/all` | JWT + Admin | Get all trips (admin only) |

**Create trip body:**
```json
{
  "tripName": "Summer in Paris",
  "destination": "Paris, France",
  "startDate": "2026-07-01",
  "endDate": "2026-07-10",
  "budget": 2000,
  "currency": "EUR",
  "arrivalTime": "08:00",
  "arrivalAirport": "Charles de Gaulle Airport",
  "departureTime": "20:00",
  "departureAirport": "Charles de Gaulle Airport",
  "hotelCheckIn": "2026-07-01T14:00",
  "hotelCheckOut": "2026-07-10T11:00",
  "hotelLocation": "Hotel du Louvre",
  "travelPreferences": ["Food", "Culture"],
  "notes": "Anniversary trip"
}
```

---

### Stops (Itinerary)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/trips/:tripId/stops` | JWT | Get all stops for a trip |
| POST | `/api/trips/:tripId/stops` | JWT | Add a stop to a trip |
| PUT | `/api/stops/:id` | JWT | Update a stop |
| DELETE | `/api/stops/:id` | JWT | Delete a stop |

**Create stop body:**
```json
{
  "day": 1,
  "time": "10:00",
  "activityTitle": "Louvre Museum",
  "location": "Rue de Rivoli, 75001 Paris",
  "category": "Culture",
  "duration": "3h",
  "notes": "Book tickets in advance",
  "lat": 48.8606,
  "lng": 2.3376
}
```

---

### Budget & Expenses

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/budget/:tripId` | JWT | Get all expenses and summary for a trip |
| POST | `/api/budget` | JWT | Add an expense |
| DELETE | `/api/budget/:id` | JWT | Delete an expense |

**Add expense body:**
```json
{
  "tripId": "<trip_id>",
  "amount": 45.50,
  "currency": "EUR",
  "category": "Food",
  "notes": "Lunch at Café de Flore"
}
```

---

### Weather

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/weather/:city` | JWT | Get current weather for a city |

---

### Places Discovery

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/places/search?query=restaurant&near=Paris&limit=10` | JWT | Search for nearby places via SerpAPI |

---

### Route Calculation

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/routing/directions` | JWT | Get route between two points |
| POST | `/api/routing/multi` | JWT | Get route across multiple waypoints |

**Directions body:**
```json
{
  "origin": { "lat": 48.8606, "lng": 2.3376 },
  "destination": { "lat": 48.8738, "lng": 2.2950 },
  "profile": "walking"
}
```

Supported profiles: `driving`, `walking`, `cycling`

Each profile uses a dedicated OSRM endpoint:
- `driving` → router.project-osrm.org
- `walking` → routing.openstreetmap.de/routed-foot
- `cycling` → routing.openstreetmap.de/routed-bike

---

### AI Itinerary Generation

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ai/:tripId/generate-ai` | JWT | Generate a full AI itinerary for a trip |

Powered by Google Gemini. The generated itinerary:
- Groups activities by geographic cluster per day
- Schedules activities only after airport arrival on day 1
- Schedules activities only before airport departure on the last day
- Automatically includes fixed logistics stops (arrival, hotel check-in, hotel check-out, departure) from the trip's stored fields

---

### Health Check

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | Public | Server health status |

---

## Running Tests

### Backend unit tests

```bash
cd backend
npm test
```

### Frontend E2E tests (Selenium)

Ensure both the backend and frontend dev servers are running first.

Install Python dependencies:

```bash
pip install pytest selenium webdriver-manager pytest-html
```

Run all tests and generate an HTML report:

```bash
pytest tests/test_frontend.py --html=report.html --self-contained-html -v
```

The test suite covers:
1. Landing page load
2. User login
3. Add trip
4. Edit trip
5. Plan view
6. Search and add a stop
7. AI itinerary generation
8. Add budget expense
9. Weather display
10. Delete trip
11. Logout

---

## Security

- **Helmet** — sets secure HTTP response headers
- **CORS** — restricted to `CORS_ORIGIN` in production
- **HPP** — protects against HTTP parameter pollution
- **Rate limiting** — 100 req / 15 min globally; 20 req / 15 min on routing endpoints
- **JWT** — all protected routes require a valid Bearer token
- **RBAC** — admin-only routes enforced via role middleware
- **Input validation** — coordinate ranges, profile values, and ObjectId formats validated on all endpoints
- **Payload size limit** — request body capped at 10 KB

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: `5000`) |
| `NODE_ENV` | No | `development` or `production` |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens |
| `CORS_ORIGIN` | No | Allowed origin (default: `*`) |
| `OPENWEATHER_API_KEY` | Yes | OpenWeatherMap API key |
| `EXCHANGE_RATE_API_KEY` | Yes | ExchangeRate API key |
| `SERPAPI_KEY` | Yes | SerpAPI key for places search |
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI generation |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | No | Backend URL (leave empty to use Vite proxy) |
