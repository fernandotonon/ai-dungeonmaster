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
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost', 
      'http://192.168.18.3', 
      'https://192.168.18.3', 
      'https://fernandotonon.github.io',
      'https://rpg.ftonon.uk',
      'https://api-rpg.ftonon.uk'
    ];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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

// Add a middleware to set CORS headers for all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/game', gameRoutes);
app.use('/ai', aiRoutes);
app.use('/health', (req, res) => {
  res.status(200).send('OK');
});


module.exports = app;