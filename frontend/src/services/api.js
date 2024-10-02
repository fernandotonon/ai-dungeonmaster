import axios from 'axios';

const API_URL = process.env.API_URL || 'https://192.168.18.3:3000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true // Required to send cookies with requests
});

export const auth = {
  register: (username, email, password) => api.post('/auth/register', { username, email, password }),
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },
  logout: () => api.post('/auth/logout'),
  checkLoginStatus: async () => {
    const response = await api.get('/auth/check');
    return response.data;
  },
};

export const game = {
  getUserGames: () => api.get('/game/user-games'),
  initGame: ({playerRole, aiModel, imageStyle, voice, title, language, storyTheme, isKidsMode}) => 
    api.post('/game/init-game', { playerRole, aiModel, imageStyle, voice, title, language, storyTheme, isKidsMode }),
  loadGame: (gameId) => api.get(`/game/load-game/${gameId}`),
  updatePreferences: (gameId, imageStyle, voice) => 
    api.post('/game/update-preferences', { gameId, imageStyle, voice }),
  addPlayer: (gameId, playerName) => api.post('/game/add-player', { gameId, playerName }),
};

export const ai = {
  submitStory: (gameId, action, sender, isKidsMode, language) => 
    api.post('/ai/story', { gameId, action, sender, isKidsMode, language}),
  getAIModels: () => api.get('/ai/models'),
  generateImage: (gameId, messageIndex, style, isKidsMode) => 
    api.post('/ai/generate-image', { gameId, messageIndex, style, isKidsMode }),
  generateAudio: (gameId, messageIndex, voice) => 
    api.post('/ai/generate-audio', { gameId, messageIndex, voice }),
  getAudioFile: (filename) => `${API_URL}/ai${filename}`,
  getImageFile: (filename) => `${API_URL}/ai${filename}`,
  getAvailableVoices: () => api.get('/ai/available-voices'),
  speechToText: (gameId, audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');
    formData.append('gameId', gameId); // Adding the gameId in the form data
  
    return api.post('/ai/speech-to-text', formData);
  },  
};

const apiServices = {
  auth,
  game,
  ai,
};

export default apiServices;