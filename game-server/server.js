const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

let gameState = {
  playerRole: null,
  aiRole: null,
  storyMessages: [],
  players: [],
  aiModel: 'gpt3'  // Default AI model
};

app.post('/init-game', (req, res) => {
  const { playerRole, aiModel } = req.body;
  gameState.playerRole = playerRole;
  gameState.aiRole = playerRole === 'DM' ? 'Player' : 'DM';
  gameState.storyMessages = [];
  gameState.players = [];
  gameState.aiModel = aiModel;
  res.json({ message: "Game initialized", gameState });
});

app.post('/add-player', (req, res) => {
  const { playerName } = req.body;
  gameState.players.push(playerName);
  res.json({ message: "Player added", players: gameState.players });
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
    
    // Remove any leading "Player:" or "DM:" from the AI response
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

app.listen(port, '0.0.0.0', () => {
  console.log(`Game server listening at http://0.0.0.0:${port}`);
});