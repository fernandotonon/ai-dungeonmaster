const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Game = mongoose.model('Game', GameSchema);

let gameState = null;

async function saveGame() {
  try {
    if (gameState._id) {
      await Game.findByIdAndUpdate(gameState._id, {
        ...gameState,
        updatedAt: new Date()
      });
    } else {
      const newGame = new Game(gameState);
      await newGame.save();
      gameState._id = newGame._id;
    }
    console.log('Game auto-saved successfully');
  } catch (error) {
    console.error('Error auto-saving game:', error);
  }
}


app.post('/init-game', async (req, res) => {
  try {
    const { playerRole, aiModel, imageStyle, voice } = req.body;
    const newGame = new Game({
      playerRole,
      aiRole: playerRole === 'DM' ? 'Player' : 'DM',
      aiModel,
      imageStyle,
      voice,
      storyMessages: [],
      players: []
    });
    await newGame.save();
    res.json({ message: "Game initialized", gameState: newGame });
  } catch (error) {
    console.error('Error initializing game:', error);
    res.status(500).json({ error: 'An error occurred while initializing the game' });
  }
});

app.post('/update-preferences', async (req, res) => {
  try {
    const { imageStyle, voice } = req.body;
    const updatedGame = await Game.findByIdAndUpdate(
      gameState._id,
      { $set: { imageStyle, voice } },
      { new: true }
    );
    gameState = updatedGame;
    res.json({ message: "Preferences updated", gameState });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'An error occurred while updating preferences' });
  }
});

app.post('/add-player', async (req, res) => {
  const { playerName } = req.body;
  gameState.players.push(playerName);
  await saveGame();
  res.json({ message: "Player added", gameState });
});

function cleanPrefix(text) {
  return text.replace(/^(Player:|DM:)\s*/i, '');
}

app.post('/story', async (req, res) => {
  try {
    const { action, sender } = req.body;
    
    const cleanedAction = cleanPrefix(action);
    
    gameState.storyMessages.push({ 
      sender, 
      content: cleanedAction, 
      audioFile: null 
    });
    
    const prompt = gameState.storyMessages.map(msg => `${msg.sender}: ${msg.content}`).join('\n');
    const aiPrompt = `${prompt}\n\nAs the ${gameState.aiRole}, respond to this:`;
    
    const aiResponse = await axios.post('http://ai-engine:5000/generate', {
      prompt: aiPrompt,
      model: gameState.aiModel
    });
    
    let aiGeneratedText = cleanPrefix(aiResponse.data.generated_text);
    
    gameState.storyMessages.push({ 
      sender: gameState.aiRole, 
      content: aiGeneratedText, 
      audioFile: null 
    });
    
    await saveGame();
    
    res.json({ aiResponse: aiGeneratedText, gameState });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});


app.post('/generate-image', async (req, res) => {
  try {
    const { messageIndex, style } = req.body;
    
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
    await saveGame();
    
    res.json({ imageUrl, prompt: response.data.prompt });
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: 'An error occurred while generating the image' });
  }
});

app.post('/generate-audio', async (req, res) => {
  try {
    const { messageIndex, voice } = req.body;
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
    await saveGame();
    
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

app.get('/game-state', (req, res) => {
  res.json(gameState);
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

app.get('/saved-games', async (req, res) => {
  try {
    const games = await Game.find().sort('-updatedAt').limit(10);
    res.json(games);
  } catch (error) {
    console.error('Error fetching saved games:', error);
    res.status(500).json({ error: 'An error occurred while fetching saved games' });
  }
});

app.get('/load-game/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (game) {
      gameState = game.toObject();
      res.json({ message: "Game loaded successfully", gameState });
    } else {
      res.status(404).json({ error: 'Game not found' });
    }
  } catch (error) {
    console.error('Error loading game:', error);
    res.status(500).json({ error: 'An error occurred while loading the game' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Game server listening at http://0.0.0.0:${port}`);
});