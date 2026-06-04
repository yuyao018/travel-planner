const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const { connectDB } = require('./config/db');
const { generalLimiter } = require('./middleware/rateLimiter');

// Route imports
const authRoutes = require('./api_routes/authRoutes');
const tripRoutes = require('./api_routes/tripRoutes');
const stopRoutes = require('./api_routes/stopRoutes');
const budgetRoutes = require('./api_routes/budgetRoutes');
const weatherRoutes = require('./api_routes/weatherRoutes');
const routingRoutes = require('./api_routes/routingRoutes');
const placesRoutes = require('./api_routes/placesRoutes');
const aiRoutes = require('./api_routes/aiRoutes');

const app = express();

// ─── Security Middleware ─────────────────────────────────────────────────────

// Helmet: Sets secure HTTP headers (X-Content-Type-Options, X-Frame-Options,
// Strict-Transport-Security, X-XSS-Protection, etc.)
app.use(helmet());

// CORS: Restrict allowed origins in production
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
};
app.use(cors(corsOptions));

// HPP: Protect against HTTP Parameter Pollution attacks
app.use(hpp());

// Body parser with size limit to prevent large payload attacks
app.use(express.json({ limit: '10kb' }));

// General rate limiting: 100 requests per 15 minutes per IP
app.use(generalLimiter);

// ─── API Routes ──────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api', stopRoutes);          // Handles /api/trips/:tripId/stops and /api/stops/:id
app.use('/api/budget', budgetRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/routing', routingRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/ai', aiRoutes);

// Health check (public)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Route Logging Function ──────────────────────────────────────────────────
function logRegisteredRoutes() {
  console.log('\n🚀 API ENDPOINTS AVAILABLE:');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const PORT = process.env.PORT || 5000;
  const baseUrl = `http://localhost:${PORT}`;

  console.log('\n📁 Authentication:');
  console.log(`  🌐 \x1b[33mPOST\x1b[0m   ${baseUrl}/api/auth/register`);
  console.log(`  🌐 \x1b[33mPOST\x1b[0m   ${baseUrl}/api/auth/login`);
  console.log(`  🔒 \x1b[33mPOST\x1b[0m   ${baseUrl}/api/auth/refresh-api-key`);

  console.log('\n📁 Health Check:');
  console.log(`  🌐 \x1b[32mGET\x1b[0m    ${baseUrl}/api/health`);

  console.log('\n📁 Trips Management:');
  console.log(`  🔒 \x1b[33mPOST\x1b[0m   ${baseUrl}/api/trips`);
  console.log(`  🔒 \x1b[32mGET\x1b[0m    ${baseUrl}/api/trips`);
  console.log(`  🔒 \x1b[32mGET\x1b[0m    ${baseUrl}/api/trips/:id`);
  console.log(`  🔒 \x1b[34mPUT\x1b[0m    ${baseUrl}/api/trips/:id`);
  console.log(`  🔒 \x1b[31mDELETE\x1b[0m ${baseUrl}/api/trips/:id`);
  console.log(`  🔒 \x1b[32mGET\x1b[0m    ${baseUrl}/api/trips/admin/all`);

  console.log('\n📁 Journey Planning (Stops):');
  console.log(`  🔒 \x1b[33mPOST\x1b[0m   ${baseUrl}/api/trips/:tripId/stops`);
  console.log(`  🔒 \x1b[32mGET\x1b[0m    ${baseUrl}/api/trips/:tripId/stops`);
  console.log(`  🔒 \x1b[34mPUT\x1b[0m    ${baseUrl}/api/stops/:id`);
  console.log(`  🔒 \x1b[31mDELETE\x1b[0m ${baseUrl}/api/stops/:id`);

  console.log('\n📁 Budget & Expenses:');
  console.log(`  🔒 \x1b[33mPOST\x1b[0m   ${baseUrl}/api/budget`);
  console.log(`  🔒 \x1b[32mGET\x1b[0m    ${baseUrl}/api/budget/:tripId`);
  console.log(`  🔒 \x1b[31mDELETE\x1b[0m ${baseUrl}/api/budget/:id`);

  console.log('\n📁 Weather Service:');
  console.log(`  🔒 \x1b[32mGET\x1b[0m    ${baseUrl}/api/weather/:city`);

  console.log('\n📁 Places Discovery:');
  console.log(`  🔒 \x1b[32mGET\x1b[0m    ${baseUrl}/api/places/search`);
  console.log(`  🔒 \x1b[32mGET\x1b[0m    ${baseUrl}/api/places/directions`);

  console.log('\n📁 Route Calculation:');
  console.log(`  🔒 \x1b[33mPOST\x1b[0m   ${baseUrl}/api/routing/directions`);
  console.log(`  🔒 \x1b[33mPOST\x1b[0m   ${baseUrl}/api/routing/multi`);

  console.log('\n📁 AI Itinerary:');
  console.log(`  🔒 \x1b[33mPOST\x1b[0m   ${baseUrl}/api/ai/:tripId/generate-ai`);

  console.log('\n📝 LEGEND:');
  console.log('  🌐 = Public endpoint (no auth required)');
  console.log('  🔒 = Protected endpoint (JWT token required)');
  console.log('  \x1b[32mGET\x1b[0m = Retrieve data  \x1b[33mPOST\x1b[0m = Create data  \x1b[34mPUT\x1b[0m = Update data  \x1b[31mDELETE\x1b[0m = Remove data');
  
  console.log('\n💡 POSTMAN TESTING WORKFLOW:');
  console.log('  1. Register: POST http://localhost:' + (process.env.PORT || 5000) + '/api/auth/register');
  console.log('     Body (JSON): {"name": "Test User", "email": "test@example.com", "password": "password123"}');
  console.log('  2. Login: POST http://localhost:' + (process.env.PORT || 5000) + '/api/auth/login');
  console.log('     Body (JSON): {"email": "test@example.com", "password": "password123"}');
  console.log('  3. Copy JWT token from login response');
  console.log('  4. For protected endpoints, add header: Authorization: Bearer <your-jwt-token>');
  console.log('  5. Test health check: GET http://localhost:' + (process.env.PORT || 5000) + '/api/health');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;

// Initialize Database connection, then fire up Express server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server executing safely on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    
    // Log all available endpoints for API testing
    logRegisteredRoutes();
  });
}).catch(err => {
  console.error('Failed to start the application server:', err);
});

module.exports = app;
