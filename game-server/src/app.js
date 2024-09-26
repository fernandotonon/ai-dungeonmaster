const express = require('express');
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
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/game', gameRoutes);
app.use('/ai', aiRoutes);

module.exports = app;