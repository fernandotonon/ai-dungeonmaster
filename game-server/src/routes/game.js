const express = require('express');
const verifyToken = require('../middleware/auth');
const Game = require('../models/Game');
const router = express.Router();
const axios = require('axios');
const { audioBucketName, imageBucketName, deleteFile } = require('../services/minioService');
const { emitGameUpdate } = require('../services/socketService');

router.get('/user-games', verifyToken, async (req, res) => {
  try {
    const games = await Game.find({
      $or: [
        { user: req.user._id },
        { 'players.userId': req.user._id }
      ]
    }).sort('-updatedAt');
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching games' });
  }
});

router.post('/init-game', verifyToken, async (req, res) => {
  try {
    const { playerRole, aiModel, imageStyle, voice, title, storyTheme, isKidsMode, language } = req.body;
    const aiRole = playerRole === 'DM' ? 'Player' : 'DM';
    const gameState = new Game({
      title,
      playerRole,
      aiRole,
      aiModel,
      imageStyle,
      voice,
      user: req.user._id,
      storyTheme,
      players: [{
        userId: req.user._id,
        username: req.user.username,
        role: playerRole,
        isHost: true,
        online: true
      }],
      status: 'waiting',
      isMultiplayer: false
    });
    
    if(storyTheme) {
      const response = await axios.post('http://192.168.18.3:5000/generate', {
        prompt: `Your role is Dungeon Master. Start a story on the theme: ${storyTheme}.`,
        model: gameState.aiModel,
        isKidsMode,
        language,
        aiRole
      });
      let aiResponse = response.data.generated_text.trim();
      
      aiResponse = aiResponse.replace(/^(Player:|DM:|\*\*DM:\*\*)\s*/i, '');
      gameState.storyMessages.push({ sender: gameState.aiRole, content: aiResponse });
    }
  
    await gameState.save();
    emitGameUpdate(gameState._id, gameState);
    res.json({ message: 'Game initialized', gameState });
  } catch (error) {
    console.error('Error initializing game:', error);
    res.status(500).json({ error: 'Error initializing game' });
  }
});

router.get('/load-game/:id', verifyToken, async (req, res) => {
  try {
    const game = await Game.findOne({
      _id: req.params.id,
      $or: [
        { user: req.user._id },
        { 'players.userId': req.user._id }
      ]
    });
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
    const { username, gameId, role } = req.body;
    const game = await Game.findOneAndUpdate(
      { _id: gameId },
      { 
        $addToSet: { 
          players: {
            userId: req.user._id,
            username,
            role,
            isHost: game.players.length === 0, // First player is host
            online: true
          }
        },
        $set: { isMultiplayer: true, updatedAt: new Date() }
      },
      { new: true }
    );

    emitGameUpdate(gameId, game);
    res.json({ gameState: game });
  } catch (error) {
    console.error('Error adding player:', error);
    res.status(500).json({ error: 'Error adding player' });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const gameId = req.params.id;
    //first delete all images and audios from minio
    const game = await Game.findOne({ _id: req.params.id, user: req.user._id });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    } 
    const imageKeys = game.storyMessages.map(message => message.image);
    const audioKeys = game.storyMessages.map(message => message.audio);
    await deleteFile(imageBucketName, imageKeys);
    await deleteFile(audioBucketName, audioKeys);
    //then delete the game
    await Game.findOneAndDelete({ _id: gameId, user: req.user._id });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({ error: 'Error deleting game' });
  }
});

// Join game
router.post('/join-game', verifyToken, async (req, res) => {
  try {
    const { gameId, role } = req.body;
    const game = await Game.findById(gameId);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.players.length >= game.maxPlayers) {
      return res.status(400).json({ error: 'Game is full' });
    }

    const playerExists = game.players.find(p => p.userId.equals(req.user._id));
    if (playerExists) {
      return res.status(400).json({ error: 'Already in game' });
    }

    game.players.push({
      userId: req.user._id,
      username: req.user.username,
      role,
      isHost: false,
      online: true
    });

    await game.save();
    emitGameUpdate(gameId, game);
    res.json({ gameState: game });
  } catch (error) {
    res.status(500).json({ error: 'Error joining game' });
  }
});

// Leave game
router.post('/leave-game', verifyToken, async (req, res) => {
  try {
    const { gameId } = req.body;
    const game = await Game.findOneAndUpdate(
      { _id: gameId },
      { 
        $pull: { 
          players: { userId: req.user._id }
        },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // If there are remaining players and the leaving player was the host,
    // assign a new host
    if (game.players.length > 0 && !game.players.some(p => p.isHost)) {
      game.players[0].isHost = true;
      await game.save();
    }

    emitGameUpdate(gameId, game);
    res.json({ message: 'Successfully left the game' });
  } catch (error) {
    console.error('Error leaving game:', error);
    res.status(500).json({ error: 'Error leaving game' });
  }
});

module.exports = router;
