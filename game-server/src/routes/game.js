const express = require('express');
const verifyToken = require('../middleware/auth');
const Game = require('../models/Game');
const router = express.Router();
const axios = require('axios');

router.get('/user-games', verifyToken, async (req, res) => {
  try {
    const games = await Game.find({ user: req.user._id }).sort('-updatedAt');
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching games' });
  }
});

router.post('/init-game', verifyToken, async (req, res) => {
  try {
    const { playerRole, aiModel, imageStyle, voice, title, storyTheme, isKidsMode, language } = req.body;
    console.log('req.body', req.body);
    const gameState = new Game({
      title,
      playerRole,
      aiRole: playerRole === 'DM' ? 'Player' : 'DM',
      aiModel,
      imageStyle,
      voice,
      user: req.user._id,
      storyTheme
    });
    
    if(storyTheme) {
      const response = await axios.post('http://192.168.18.3:5000/generate', {
        prompt: `Act as a dungeon master in a story about ${storyTheme}. Start the story. Use short sentences and simple language.`,
        model: gameState.aiModel,
        isKidsMode,
        language
      });
      let aiResponse = response.data.generated_text.trim();
      
      aiResponse = aiResponse.replace(/^(Player:|DM:|\*\*DM:\*\*)\s*/i, '');
      gameState.storyMessages.push({ sender: gameState.aiRole, content: aiResponse });
    }
  
    await gameState.save();
    res.json({ message: 'Game initialized', gameState });
  } catch (error) {
    console.error('Error initializing game:', error);
    res.status(500).json({ error: 'Error initializing game' });
  }
});

router.get('/load-game/:id', verifyToken, async (req, res) => {
  try {
    const game = await Game.findOne({ _id: req.params.id, user: req.user._id });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json({ gameState: game });
  } catch (error) {
    res.status(500).json({ error: 'Error loading game' });
  }
});

router.post('/update-preferences', verifyToken, async (req, res) => {
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

router.put('/update-game', verifyToken, async (req, res) => {
  try {
    const { gameId, title, storyTheme } = req.body;
    const updateFields = { updatedAt: new Date() };

    if (title) updateFields.title = title;
    if (storyTheme) updateFields.storyTheme = storyTheme;

    const game = await Game.findOneAndUpdate(
      { _id: gameId, user: req.user._id },
      { $set: updateFields },
      { new: true }
    );
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json({ gameState: game });
  } catch (error) {
    res.status(500).json({ error: 'Error updating game' });
  }
});

router.post('/add-player', verifyToken, async (req, res) => {
  try {
    const { playerName, gameId } = req.body;

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

module.exports = router;