const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
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

const GameSchema = new mongoose.Schema({
  title: String,
  playerRole: String,
  aiRole: String,
  storyMessages: [{
    sender: String,
    content: String
  }],
  players: [String],
  aiModel: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Game = mongoose.model('Game', GameSchema);

let gameState = null;

app.post('/init-game', (req, res) => {
  const { playerRole, aiModel, title } = req.body;
  gameState = {
    title,
    playerRole,
    aiRole: playerRole === 'DM' ? 'Player' : 'DM',
    storyMessages: [],
    players: [],
    aiModel
  };
  res.json({ message: "Game initialized", gameState });
});

app.post('/add-player', (req, res) => {
  const { playerName } = req.body;
  gameState.players.push(playerName);
  res.json({ message: "Player added", gameState });
});

app.post('/story', async (req, res) => {
  try {
    const { action, sender } = req.body;
    gameState.storyMessages.push({ sender, content: action });
    
    const prompt = gameState.storyMessages.map(msg => `${msg.sender}: ${msg.content}`).join('\n');
    const aiPrompt = `${prompt}\n\nAs the ${gameState.aiRole}, respond to this:`;
    
    const response = await axios.post('http://ai-engine:5000/generate', {
      prompt: aiPrompt,
      model: gameState.aiModel
    });
    let aiResponse = response.data.generated_text.trim();
    
    aiResponse = aiResponse.replace(/^(Player:|DM:)\s*/i, '');
    
    gameState.storyMessages.push({ sender: gameState.aiRole, content: aiResponse });
    
    res.json({ aiResponse, gameState });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred' });
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

app.post('/save-game', async (req, res) => {
  try {
    if (gameState._id) {
      await Game.findByIdAndUpdate(gameState._id, {
        ...gameState,
        updatedAt: new Date()
      });
      res.json({ message: "Game updated successfully", gameId: gameState._id });
    } else {
      const newGame = new Game(gameState);
      await newGame.save();
      gameState._id = newGame._id;
      res.json({ message: "Game saved successfully", gameId: newGame._id });
    }
  } catch (error) {
    console.error('Error saving game:', error);
    res.status(500).json({ error: 'An error occurred while saving the game' });
  }
});

app.get('/saved-games', async (req, res) => {
  try {
    const games = await Game.find().sort('-createdAt').limit(10);
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
