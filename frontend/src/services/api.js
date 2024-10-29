import axios from 'axios';

const API_URL = 'https://api-rpg.ftonon.uk';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true // Required to send cookies with requests
});

api.interceptors.request.use(config => {
  config.headers['ngrok-skip-browser-warning'] = 'true'; // Set the header
  // add token from session storage
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
}, error => {
  return Promise.reject(error);
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
  addPlayer: (gameId, username, role) => 
    api.post('/game/add-player', { gameId, username, role }),
  updateGame: ({gameId, title, storyTheme}) => 
    api.put('/game/update-game', { gameId, title, storyTheme }),
  deleteGame: (gameId) => api.delete(`/game/${gameId}`),
  joinGame: (gameId, role) => api.post('/game/join-game', { gameId, role }),
  leaveGame: (gameId) => api.post('/game/leave-game', { gameId }),
  getPublicGames: () => api.get('/game/public-games'),
};

export const ai = {
  submitStory: (gameId, action, sender, isKidsMode, language) => 
    api.post('/ai/story', { gameId, action, sender, isKidsMode, language}),
  getAIModels: () => api.get('/ai/models'),
  generateImage: (gameId, messageIndex, style, isKidsMode, theme) => 
    api.post('/ai/generate-image', { gameId, messageIndex, style, isKidsMode, theme }),
  generateAudio: ({gameId, messageIndex, voice, language}) => 
    api.post('/ai/generate-audio', { gameId, messageIndex, voice, language }),
  getImageFile: async (filename) => {
      const response = await api.get(`/ai${filename}`, {
        responseType: 'blob'
      });
      return URL.createObjectURL(response.data);
  },
  getAudioFile: async (filename) => {
    const response = await api.get(`/ai${filename}`, {
      responseType: 'blob'
    });
    return URL.createObjectURL(response.data);
  },
  getAvailableVoices: () => api.get('/ai/available-voices'),
  speechToText: ({gameId, audioBlob, language}) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');
    formData.append('gameId', gameId); // Adding the gameId in the form data
    formData.append('language', language); 
  
    return api.post('/ai/speech-to-text', formData);
  },  
};

const apiServices = {
  auth,
  game,
  ai,
  health: () => api.get('/health'),
};

export default apiServices;
