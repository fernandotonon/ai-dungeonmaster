const mongoose = require('mongoose');

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
  players: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    role: String,
    isHost: Boolean,
    online: { type: Boolean, default: false }
  }],
  maxPlayers: { type: Number, default: 6 },
  isPublic: { type: Boolean, default: false },
  status: { type: String, enum: ['waiting', 'in_progress', 'completed'], default: 'waiting' },
  aiModel: String,
  storyTheme: String,
  imageStyle: { type: String, default: 'hand-drawn' },
  voice: { type: String, default: 'onyx' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isMultiplayer: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Game', GameSchema);
