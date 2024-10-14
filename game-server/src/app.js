const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const connectDB = require('./config/db');
const { initializeBuckets } = require('./services/minioService');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const aiRoutes = require('./routes/ai');

const app = express();

// Connect to MongoDB
connectDB();

// Initialize MinIO buckets
initializeBuckets();

const corsOptions = {
  origin: ['http://localhost', 
    'http://192.168.18.3', 
    'https://192.168.18.3', 
    'https://fernandotonon.github.io'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
    credentials: true,
    optionsSuccessStatus: 204
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

// Routes
app.use('/auth', authRoutes);
app.use('/game', gameRoutes);
app.use('/ai', aiRoutes);


module.exports = app;