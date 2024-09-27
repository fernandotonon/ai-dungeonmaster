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

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost', 
  credentials: true
}));

// Routes
app.use('/auth', authRoutes);
app.use('/game', gameRoutes);
app.use('/ai', aiRoutes);

module.exports = app;