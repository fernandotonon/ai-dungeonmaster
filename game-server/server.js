const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Minio = require('minio');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function() {
  console.log('Connected to MongoDB');
});

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY
});

const audioBucketName = process.env.MINIO_AUDIO_BUCKET_NAME || 'audio-files';
const imageBucketName = process.env.MINIO_IMAGE_BUCKET_NAME || 'image-files';

// Ensure both buckets exist
(async () => {
  try {
    for (const bucketName of [audioBucketName, imageBucketName]) {
      const bucketExists = await minioClient.bucketExists(bucketName);
      if (!bucketExists) {
        await minioClient.makeBucket(bucketName);
        console.log(`Bucket ${bucketName} created.`);
      } else {
        console.log(`Bucket ${bucketName} already exists.`);
      }
    }
  } catch (err) {
    console.error('Error setting up MinIO buckets:', err);
  }
})();

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Game Schema
const GameSchema = new mongoose.Schema({
  title: String,
  playerRole: String,
  aiRole: String,
  storyMessages: [{
    sender: String,
    content: String,
    audioFile: String,
    imageFile: String
  }],
  players: [String],
  aiModel: String,
  imageStyle: { type: String, default: 'hand-drawn' },
  voice: { type: String, default: 'onyx' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Game = mongoose.model('Game', GameSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// Routes
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error registering user' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign({ _id: user._id }, JWT_SECRET);
    res.json({ token, userId: user._id });
  } catch (error) {
    res.status(500).json({ error: 'Error logging in' });
  }
});

app.get('/user-games', verifyToken, async (req, res) => {
  try {
    const games = await Game.find({ user: req.user._id }).sort('-updatedAt');
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching games' });
  }
});

app.post('/init-game', verifyToken, async (req, res) => {
  try {
    const { playerRole, aiModel, imageStyle, voice, title } = req.body;
    const gameState = new Game({
      title,
      playerRole,
      aiRole: playerRole === 'DM' ? 'Player' : 'DM',
      aiModel,
      imageStyle,
      voice,
      user: req.user._id
    });
    await gameState.save();
    res.json({ message: 'Game initialized', gameState });
  } catch (error) {
    res.status(500).json({ error: 'Error initializing game' });
  }
});

app.get('/load-game/:id', verifyToken, async (req, res) => {
  try {
    const game = await Game.findOne({ _id: req.params.id, user: req.user._id });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json({ gameState: game });
  } catch (error) {
    res.status(500).json({ error: 'Error loading game' });
  }
});

app.post('/update-preferences', verifyToken, async (req, res) => {
  try {
    const { gameId, imageStyle, voice } = req.body;
    const game = await Game.findOneAndUpdate(
      { _id: gameId, user: req.user._id },
      { $set: { imageStyle, voice, updatedAt: new Date() } },
      { new: true }
    );
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json({ gameState: game });
  } catch (error) {
    res.status(500).json({ error: 'Error updating preferences' });
  }
});

app.post('/add-player', verifyToken, async (req, res) => {
  try {
    const { playerName } = req.body;
    const gameId = req.body.gameId || req.query.gameId; // Accept gameId from body or query

    if (!gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    const game = await Game.findOneAndUpdate(
      { _id: gameId, user: req.user._id },
      { $addToSet: { players: playerName }, $set: { updatedAt: new Date() } },
      { new: true }
    );

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({ gameState: game });
  } catch (error) {
    console.error('Error adding player:', error);
    res.status(500).json({ error: 'Error adding player' });
  }
});

app.post('/story', verifyToken, async (req, res) => {
  try {
    const { gameId, action, sender } = req.body;
    
    if (!gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    const game = await Game.findOne({ _id: gameId, user: req.user._id });
    if (!game) return res.status(404).json({ error: 'Game not found' });

    game.storyMessages.push({ sender, content: action });
    game.updatedAt = new Date();

    const prompt = game.storyMessages.map(msg => `${msg.sender}: ${msg.content}`).join('\n');
    const aiPrompt = `${prompt}\n\nAs the ${game.aiRole}, respond to this:`;
    
    const response = await axios.post('http://ai-engine:5000/generate', {
      prompt: aiPrompt,
      model: game.aiModel
    });
    let aiResponse = response.data.generated_text.trim();
    
    // Remove any leading "Player:" or "DM:" from the AI response
    aiResponse = aiResponse.replace(/^(Player:|DM:)\s*/i, '');
    game.storyMessages.push({ sender: game.aiRole, content: aiResponse });

    await game.save();
    res.json({ gameState: game });
  } catch (error) {
    console.error('Error updating story:', error);
    res.status(500).json({ error: 'Error updating story' });
  }
});

app.get('/ai-models', async (req, res) => {
  try {
    const response = await axios.get('http://ai-engine:5000/models');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching AI models:', error);
    res.status(500).json({ error: 'An error occurred while fetching AI models' });
  }
});

app.post('/generate-image', verifyToken, async (req, res) => {
  try {
    const { gameId, messageIndex, style } = req.body;
    
    if (!gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    const gameState = await Game.findOne({ _id: gameId, user: req.user._id });
    if (!gameState) return res.status(404).json({ error: 'Game not found' });

    const currentMessage = gameState.storyMessages[messageIndex];
    const contextMessages = gameState.storyMessages.slice(Math.max(0, messageIndex - 3), messageIndex + 1);
    
    const contextPrompt = contextMessages.map(msg => `${msg.sender}: ${msg.content}`).join('\n');
    
    const response = await axios.post('http://ai-engine:5000/generate-image', { 
      contextPrompt,
      currentMessage: currentMessage.content,
      style
    });
    
    const imageData = response.data.image;
    
    const buffer = Buffer.from(imageData, 'base64');
    const imageFileName = `image_${Date.now()}.png`;
    
    await minioClient.putObject(imageBucketName, imageFileName, buffer);
    
    const imageUrl = `/image/${imageFileName}`;
    currentMessage.imageFile = imageUrl;
    await gameState.save();
    
    res.json({ imageUrl, prompt: response.data.prompt });
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: 'An error occurred while generating the image' });
  }
});

app.post('/generate-audio', verifyToken, async (req, res) => {
  try {
    const { gameId, messageIndex, voice } = req.body;
    if (!gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    const gameState = await Game.findOne({ _id: gameId, user: req.user._id });
    if (!gameState) return res.status(404).json({ error: 'Game not found' });

    const message = gameState.storyMessages[messageIndex];
    
    if (message.audioFile) {
      try {
        await minioClient.statObject(audioBucketName, message.audioFile.split('/').pop());
        return res.json({ audioFile: message.audioFile });
      } catch (err) {
        if (err.code !== 'NotFound') throw err;
      }
    }
    
    const audioFileName = `audio_${Date.now()}.mp3`;
    const audioFile = await generateAndStoreAudio(message.content, audioFileName, voice);
    
    message.audioFile = audioFile;
    await gameState.save();
    
    res.json({ audioFile: message.audioFile });
  } catch (error) {
    console.error('Error generating audio:', error);
    res.status(500).json({ error: 'An error occurred while generating audio' });
  }
});

async function generateAndStoreAudio(text, filename, voice) {
  try {
    const response = await axios.post('http://ai-engine:5000/tts', 
      { text, voice },
      { responseType: 'arraybuffer' }
    );
    
    const buffer = Buffer.from(response.data);
    await minioClient.putObject(audioBucketName, filename, buffer);
    
    return `/audio/${filename}`;
  } catch (error) {
    console.error('Error generating and storing audio:', error);
    throw error;
  }
}

app.get('/available-voices', async (req, res) => {
  try {
    const response = await axios.get('http://ai-engine:5000/available-voices');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching available voices:', error);
    res.status(500).json({ error: 'An error occurred while fetching available voices' });
  }
});

app.get('/audio/:filename', async (req, res) => {
  try {
    const objectName = req.params.filename;
    const stream = await minioClient.getObject(audioBucketName, objectName);
    
    res.setHeader('Content-Type', 'audio/mpeg');
    stream.pipe(res);
  } catch (error) {
    console.error('Error retrieving audio file:', error);
    res.status(404).send('Audio file not found');
  }
});

app.get('/image/:filename', async (req, res) => {
  try {
    const objectName = req.params.filename;
    const stream = await minioClient.getObject(imageBucketName, objectName);
    
    res.setHeader('Content-Type', 'image/png');
    stream.pipe(res);
  } catch (error) {
    console.error('Error retrieving image file:', error);
    res.status(404).send('Image file not found');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Game server listening at http://localhost:${port}`);
});