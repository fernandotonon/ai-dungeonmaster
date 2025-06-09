const express = require('express');
const verifyToken = require('../middleware/auth');
const Game = require('../models/Game');
const User = require('../models/User');
const router = express.Router();
const { audioBucketName, imageBucketName, deleteFile } = require('../services/minioService');
const { emitGameUpdate } = require('../services/socketService');
const { sendInviteEmail } = require('../services/emailService');
const { notifyGameParticipants } = require('../services/notificationService');
const { generateResponse, getMappedModel } = require('../services/openRouterService');

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
      // Use OpenRouter instead of ai-engine
      const mappedModel = getMappedModel(aiModel);
      let aiResponse = await generateResponse(`Your role is ${aiRole}. Start a story on the theme: ${storyTheme}.`, mappedModel, isKidsMode, language, aiRole);
      
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
    const { gameId, role, email } = req.body;
    const game = await Game.findOne({ _id: gameId, user: req.user._id });
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    if(!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      const inviteLink = `${process.env.FRONTEND_URL}/join/${gameId}`;
      await sendInviteEmail(email, inviteLink, game.title, req.user.username);
      return res.json({ message: 'User invited', gameState: game });
    }
    
    game.players.push({
      userId: user._id,
      username: user.username,
      role,
      isHost: false
    });

    await game.save();
    emitGameUpdate(gameId, game);
    
    // Send notification to the added player
    await notifyGameParticipants(
      game, 
      'New Game Invitation', 
      `You have been added to the game "${game.title}"`,
      { type: 'player_added' }
    );
    
    res.json({ gameState: game });
  } catch (error) {
    res.status(500).json({ error: 'Error adding player: ' + error });
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
    
    // Send notification to all players except the one joining
    await notifyGameParticipants(
      game, 
      'New Player Joined', 
      `${req.user.username} has joined the game "${game.title}"`,
      { type: 'player_joined' }
    );
    
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
      game.user = game.players[0].userId;
      await game.save();
    }

    emitGameUpdate(gameId, game);
    res.json({ message: 'Successfully left the game' });
  } catch (error) {
    console.error('Error leaving game:', error);
    res.status(500).json({ error: 'Error leaving game' });
  }
});

// Remove player
router.post('/remove-player', verifyToken, async (req, res) => {
  try {
    const { gameId, userId } = req.body;
    const game = await Game.findOneAndUpdate(
      { _id: gameId },
      { new: true }
    );

    if (!game || game.players.filter(p => p.userId.toString() === req.user._id.toString() && p.isHost).length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    if(game.players.filter(p => p.userId.toString() === userId).length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get the player's username before removing
    const playerToRemove = game.players.find(p => p.userId.toString() === userId);
    const playerUsername = playerToRemove ? playerToRemove.username : 'A player';

    game.players = game.players.filter(p => p.userId.toString() !== userId);
    await game.save();

    emitGameUpdate(gameId, game);
    
    // Send notification to all remaining players
    await notifyGameParticipants(
      game, 
      'Player Removed', 
      `${playerUsername} has been removed from the game "${game.title}"`,
      { type: 'player_removed' }
    );
    
    // Also notify the removed player
    if (playerToRemove) {
      await notifyGameParticipants(
        { 
          _id: game._id, 
          user: game.user,
          players: [{ userId }] 
        }, 
        'Removed from Game', 
        `You have been removed from the game "${game.title}"`,
        { type: 'removed_from_game' }
      );
    }
    
    res.json({ gameState: game });
  } catch (error) {
    res.status(500).json({ error: 'Error removing player' });
  }
});

module.exports = router;