const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const { connectDB } = require('./config/db');
const authRoutes = require('./api_routes/authRoutes');
const tripRoutes = require('./api_routes/tripRoutes');

const app = express();

app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(hpp());

app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);

const PORT = process.env.PORT || 5000;

// Initialize Database connection, then fire up Express server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server executing safely on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });
}).catch(err => {
    console.error("Failed to start the application server:", err);
});