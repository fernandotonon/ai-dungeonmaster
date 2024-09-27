const express = require('express');
const axios = require('axios');
const stream = require('stream');
const verifyToken = require('../middleware/auth');
const Game = require('../models/Game');
const { storeFile, getFile, audioBucketName, imageBucketName } = require('../services/minioService');

const router = express.Router();

router.post('/story', verifyToken, async (req, res) => {
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
    
    aiResponse = aiResponse.replace(/^(Player:|DM:)\s*/i, '');
    game.storyMessages.push({ sender: game.aiRole, content: aiResponse });

    await game.save();
    res.json({ gameState: game });
  } catch (error) {
    console.error('Error updating story:', error);
    res.status(500).json({ error: 'Error updating story' });
  }
});

router.get('/models', async (req, res) => {
  try {
    const response = await axios.get('http://ai-engine:5000/models');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching AI models:', error);
    res.status(500).json({ error: 'An error occurred while fetching AI models' });
  }
});

router.post('/generate-image', verifyToken, async (req, res) => {
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
    const imageFileName = `image_${gameId}_${Date.now()}.png`;
    
    await storeFile(imageBucketName, imageFileName, buffer);
    
    currentMessage.imageFile = `/image/${imageFileName}`;
    await gameState.save();
    
    res.json({ imageUrl: currentMessage.imageFile, prompt: response.data.prompt });
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: 'An error occurred while generating the image' });
  }
});

router.post('/generate-audio', verifyToken, async (req, res) => {
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
        await getFile(audioBucketName, message.audioFile.split('/').pop());
        return res.json({ audioFile: message.audioFile });
      } catch (err) {
        if (err.code !== 'NotFound') throw err;
      }
    }
    
    const response = await axios.post('http://ai-engine:5000/tts', 
      { text: message.content, voice },
      { responseType: 'arraybuffer' }
    );
    
    const buffer = Buffer.from(response.data);
    const audioFileName = `audio_${gameId}_${Date.now()}.mp3`;
    
    await storeFile(audioBucketName, audioFileName, buffer);
    
    message.audioFile = `/audio/${audioFileName}`;
    await gameState.save();
    
    res.json({ audioFile: message.audioFile });
  } catch (error) {
    console.error('Error generating audio:', error);
    res.status(500).json({ error: 'An error occurred while generating audio' });
  }
});

router.get('/available-voices', async (req, res) => {
  try {
    const response = await axios.get('http://ai-engine:5000/available-voices');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching available voices:', error);
    res.status(500).json({ error: 'An error occurred while fetching available voices' });
  }
});

router.get('/audio/:filename', async (req, res) => {
  try {
    const objectName = req.params.filename;
    const stream = await getFile(audioBucketName, objectName);
    
    res.setHeader('Content-Type', 'audio/mpeg');
    stream.pipe(res);
  } catch (error) {
    console.error('Error retrieving audio file:', error);
    res.status(404).send('Audio file not found');
  }
});

router.get('/image/:filename', async (req, res) => {
  try {
    const objectName = req.params.filename;
    const stream = await getFile(imageBucketName, objectName);
    
    res.setHeader('Content-Type', 'image/png');
    stream.pipe(res);
  } catch (error) {
    console.error('Error retrieving image file:', error);
    res.status(404).send('Image file not found');
  }
});

router.post('/speech-to-text', verifyToken, (req, res) => {
  const passThrough = new stream.PassThrough();

  axios.post('http://ai-engine:5000/speech-to-text', passThrough, {
    headers: {
      ...req.headers,
      'host': 'ai-engine:5000',
      'content-type': 'audio/webm',
    },
    responseType: 'json',
  })
  .then(response => {
    res.json(response.data);
  })
  .catch(error => {
    console.error('Error in speech to text conversion:', error);
    res.status(500).json({ error: 'An error occurred during speech to text conversion' });
  });

  req.pipe(passThrough);
});

module.exports = router;