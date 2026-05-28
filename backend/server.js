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
  });
}).catch(err => {
  console.error('Failed to start the application server:', err);
});

module.exports = app;
