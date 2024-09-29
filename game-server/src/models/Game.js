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
  players: [String],
  aiModel: String,
  storyTheme: String,
  imageStyle: { type: String, default: 'hand-drawn' },
  voice: { type: String, default: 'onyx' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Game', GameSchema);