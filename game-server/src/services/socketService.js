const { Server } = require('socket.io');
const Game = require('../models/Game');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:3000', 'http://192.168.18.3', 'https://192.168.18.3', 'https://fernandotonon.github.io'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('joinGame', async (gameId) => {
      socket.join(gameId);
      console.log(`Client ${socket.id} joined game ${gameId}`);
      
      // Update player online status
      try {
        const game = await Game.findById(gameId);
        if (game) {
          game.players = game.players.map(player => ({
            ...player,
            online: true
          }));
          await game.save();
          emitGameUpdate(gameId, game);
        }
      } catch (error) {
        console.error('Error updating player status:', error);
      }
    });

    socket.on('leaveGame', async (gameId) => {
      socket.leave(gameId);
      console.log(`Client ${socket.id} left game ${gameId}`);
      
      // Update player online status
      try {
        const game = await Game.findById(gameId);
        if (game) {
          game.players = game.players.map(player => ({
            ...player,
            online: false
          }));
          await game.save();
          emitGameUpdate(gameId, game);
        }
      } catch (error) {
        console.error('Error updating player status:', error);
      }
    });

    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);
      // Handle disconnection and update player status
      try {
        const games = await Game.find({ 'players.socketId': socket.id });
        for (const game of games) {
          game.players = game.players.map(player => 
            player.socketId === socket.id ? { ...player, online: false } : player
          );
          await game.save();
          emitGameUpdate(game._id, game);
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });
};

const emitGameUpdate = (gameId, gameState) => {
  if (io) {
    io.to(gameId).emit('gameUpdate', gameState);
  }
};

module.exports = {
  initializeSocket,
  emitGameUpdate
};
