import axios from 'axios';

const API_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
});

// Add a request interceptor to include the token in every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const auth = {
  register: (username, email, password) => api.post('/auth/register', { username, email, password }),
  login: (username, password) => api.post('/auth/login', { username, password }),
};

export const game = {
  getUserGames: () => api.get('/game/user-games'),
  initGame: (playerRole, aiModel, imageStyle, voice, title) => 
    api.post('/game/init-game', { playerRole, aiModel, imageStyle, voice, title }),
  loadGame: (gameId) => api.get(`/game/load-game/${gameId}`),
  updatePreferences: (gameId, imageStyle, voice) => 
    api.post('/game/update-preferences', { gameId, imageStyle, voice }),
  addPlayer: (gameId, playerName) => api.post('/game/add-player', { gameId, playerName }),
};

export const ai = {
  submitStory: (gameId, action, sender) => api.post('/ai/story', { gameId, action, sender }),
  getAIModels: () => api.get('/ai/models'),
  generateImage: (gameId, messageIndex, style) => 
    api.post('/ai/generate-image', { gameId, messageIndex, style }),
  generateAudio: (gameId, messageIndex, voice) => 
    api.post('/ai/generate-audio', { gameId, messageIndex, voice }),
  getAudioFile: (filename) => `${API_URL}/ai${filename}`,
  getImageFile: (filename) => `${API_URL}/ai${filename}`,
  getAvailableVoices: () => api.get('/ai/available-voices'),
  speechToText: (formData) => api.post('/ai/speech-to-text', formData, {
    headers: {
      'Content-Type': 'audio/webm',  
    },
  }),
};

const apiServices = {
  auth,
  game,
  ai,
};

export default apiServices;