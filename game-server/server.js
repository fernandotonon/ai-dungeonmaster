const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use('/audio', express.static('audio_files'));

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function() {
  console.log('Connected to MongoDB');
});

const GameSchema = new mongoose.Schema({
  title: String,
  playerRole: String,
  aiRole: String,
  storyMessages: [{
    sender: String,
    content: String,
    audioFile: String
  }],
  players: [String],
  aiModel: String,
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
  const { playerRole, aiModel, title } = req.body;
  gameState = {
    title,
    playerRole,
    aiRole: playerRole === 'DM' ? 'Player' : 'DM',
    storyMessages: [],
    players: [],
    aiModel
  };
  await saveGame();
  res.json({ message: "Game initialized", gameState });
});

app.post('/add-player', async (req, res) => {
  const { playerName } = req.body;
  gameState.players.push(playerName);
  await saveGame();
  res.json({ message: "Player added", gameState });
});

app.post('/story', async (req, res) => {
  try {
    const { action, sender } = req.body;
    
    gameState.storyMessages.push({ 
      sender, 
      content: action, 
      audioFile: null 
    });
    
    const prompt = gameState.storyMessages.map(msg => `${msg.sender}: ${msg.content}`).join('\n');
    const aiPrompt = `${prompt}\n\nAs the ${gameState.aiRole}, respond to this:`;
    
    const aiResponse = await axios.post('http://ai-engine:5000/generate', {
      prompt: aiPrompt,
      model: gameState.aiModel
    });
    
    let aiGeneratedText = aiResponse.data.generated_text;
    
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

app.post('/generate-audio', async (req, res) => {
  try {
    const { messageIndex } = req.body;
    const message = gameState.storyMessages[messageIndex];
    
    if (message.audioFile) {
      return res.json({ audioFile: message.audioFile });
    }
    
    const response = await axios.post('http://ai-engine:5000/tts', 
      { text: message.content },
      { responseType: 'arraybuffer' }
    );
    
    const audioFileName = `audio_${Date.now()}.mp3`;
    const audioFilePath = path.join(__dirname, 'audio_files', audioFileName);
    await fs.writeFile(audioFilePath, response.data);
    
    message.audioFile = `/audio/${audioFileName}`;
    await saveGame();
    
    res.json({ audioFile: message.audioFile });
  } catch (error) {
    console.error('Error generating audio:', error);
    res.status(500).json({ error: 'An error occurred while generating audio' });
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