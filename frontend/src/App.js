import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [gameState, setGameState] = useState(null);
  const [aiModels, setAiModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('gpt4o-mini');
  const [error, setError] = useState(null);
  const [audioPlayer] = useState(new Audio());
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageStyle, setImageStyle] = useState('hand-drawn');
  const [selectedVoice, setSelectedVoice] = useState('onyx');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [savedGames, setSavedGames] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [action, setAction] = useState('');

  const imageStyles = [
    'realistic', 'cartoon', 'anime', 'hand-drawn', 'pixel art', 
    'fantasy illustration', 'oil painting', 'watercolor'
  ];

  useEffect(() => {
    fetchAiModels();
    fetchAvailableVoices();
    fetchSavedGames();
  }, []);


  const fetchAiModels = async () => {
    try {
      const response = await axios.get('http://localhost:3000/ai-models');
      setAiModels(response.data.models);
    } catch (error) {
      console.error('Error fetching AI models:', error);
      setError('Failed to fetch AI models');
    }
  };

  const fetchAvailableVoices = async () => {
    try {
      const response = await axios.get('http://localhost:3000/available-voices');
      setAvailableVoices(response.data.voices);
    } catch (error) {
      console.error('Error fetching available voices:', error);
    }
  };

  const fetchSavedGames = async () => {
    try {
      const response = await axios.get('http://localhost:3000/saved-games');
      setSavedGames(response.data);
    } catch (error) {
      console.error('Error fetching saved games:', error);
      setError('Failed to fetch saved games');
    }
  };

  const initGame = async (role) => {
    try {
      const response = await axios.post('http://localhost:3000/init-game', { 
        playerRole: role,
        aiModel: selectedModel,
        imageStyle,
        voice: selectedVoice
      });
      setGameState(response.data.gameState);
      setError(null);
    } catch (error) {
      console.error('Error initializing game:', error);
      setError('Failed to initialize game');
    }
  };

  const loadGame = async (gameId) => {
    try {
      const response = await axios.get(`http://localhost:3000/load-game/${gameId}`);
      setGameState(response.data.gameState);
      setImageStyle(response.data.gameState.imageStyle || 'hand-drawn');
      setSelectedVoice(response.data.gameState.voice || 'onyx');
    } catch (error) {
      console.error('Error loading game:', error);
      setError('Failed to load game');
    }
  };

  const updatePreferences = async (newImageStyle, newVoice) => {
    try {
      const response = await axios.post('http://localhost:3000/update-preferences', {
        imageStyle: newImageStyle,
        voice: newVoice
      });
      setGameState(response.data.gameState);
    } catch (error) {
      console.error('Error updating preferences:', error);
      setError('Failed to update preferences');
    }
  };

  const addPlayer = async () => {
    try {
      const response = await axios.post('http://localhost:3000/add-player', { playerName });
      setPlayerName('');
      setGameState(response.data.gameState);
    } catch (error) {
      console.error('Error adding player:', error);
      setError('Failed to add player');
    }
  };

  const submitAction = async () => {
    try {
      const response = await axios.post('http://localhost:3000/story', { 
        action, 
        sender: gameState.playerRole
      });
      setGameState(response.data.gameState);
      setAction('');
    } catch (error) {
      console.error('Error submitting action:', error);
      setError('Failed to submit action');
    }
  };

  const renderInitialScreen = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4">Welcome to AI DungeonMaster</h2>
      <div className="mb-6">
        <h2 className="text-xl mb-2">Start a new game:</h2>
        <select 
          value={selectedModel} 
          onChange={(e) => setSelectedModel(e.target.value)}
          className="p-2 border rounded mr-2 w-full mb-2"
        >
          {aiModels.map(model => (
            <option key={model} value={model}>{model.toUpperCase()}</option>
          ))}
        </select>
        <button className="bg-blue-500 text-white px-4 py-2 mr-2 rounded" onClick={() => initGame('DM')}>New Game as Dungeon Master</button>
        <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={() => initGame('Player')}>New Game as Player</button>
      </div>
      
      <h3 className="text-xl font-bold mt-6 mb-2">Or continue a saved game:</h3>
      {savedGames.length > 0 ? (
        <ul className="list-disc pl-5">
          {savedGames.map((game) => (
            <li key={game._id} className="mb-2">
              <button 
                onClick={() => loadGame(game._id)}
                className="text-blue-500 hover:underline"
              >
                {game.title || 'Untitled'} - {new Date(game.updatedAt).toLocaleString()}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No saved games available.</p>
      )}
    </div>
  );

  const generateImage = async (messageIndex) => {
    if (isGeneratingImage) return;

    setIsGeneratingImage(true);
    try {
      const response = await axios.post('http://localhost:3000/generate-image', { 
        messageIndex,
        style: imageStyle
      });
      const updatedGameState = { ...gameState };
      updatedGameState.storyMessages[messageIndex].imageFile = response.data.imageUrl;
      setGameState(updatedGameState);
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const generateAndPlayAudio = async (messageIndex) => {
    if (isGeneratingAudio) return;

    setIsGeneratingAudio(true);
    try {
      const response = await axios.post('http://localhost:3000/generate-audio', { 
        messageIndex,
        voice: selectedVoice
      });
      const audioFile = response.data.audioFile;
      audioPlayer.src = `http://localhost:3000${audioFile}`;
      audioPlayer.play();
      
      const updatedGameState = { ...gameState };
      updatedGameState.storyMessages[messageIndex].audioFile = audioFile;
      setGameState(updatedGameState);
    } catch (error) {
      console.error('Error generating audio:', error);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const renderGameInterface = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4">{gameState.title || 'Untitled Story'}</h2>
      
      <div className="mb-4">
        <label className="mr-2">Image Style:</label>
        <select 
          value={imageStyle} 
          onChange={(e) => {
            const newStyle = e.target.value;
            setImageStyle(newStyle);
            updatePreferences(newStyle, selectedVoice);
          }}
        >
          {imageStyles.map(style => (
            <option key={style} value={style}>{style.charAt(0).toUpperCase() + style.slice(1)}</option>
          ))}
        </select>
      </div>
      
      <div className="mb-4">
        <label className="mr-2">Voice:</label>
        <select 
          value={selectedVoice} 
          onChange={(e) => {
            const newVoice = e.target.value;
            setSelectedVoice(newVoice);
            updatePreferences(imageStyle, newVoice);
          }}
        >
          {availableVoices.map(voice => (
            <option key={voice} value={voice}>{voice}</option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <p>Your Role: {gameState.playerRole}</p>
        <p>AI Role: {gameState.aiRole}</p>
        <p>AI Model: {gameState.aiModel}</p>
        <p>Players: {gameState.players.join(', ')}</p>
      </div>

      {gameState.playerRole === 'DM' && (
        <div className="mb-6">
          <input 
            type="text" 
            value={playerName} 
            onChange={(e) => setPlayerName(e.target.value)} 
            placeholder="Enter player name" 
            className="border p-2 mr-2 rounded"
          />
          <button onClick={addPlayer} className="bg-purple-500 text-white px-4 py-2 rounded">Add Player</button>
        </div>
      )}

      <div className="mb-6">
        <textarea
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Enter your action or narrative..."
          className="w-full h-32 p-2 border mb-2 rounded"
        />
        <button onClick={submitAction} className="bg-red-500 text-white px-4 py-2 rounded">Submit Action</button>
      </div>

      <div className="mt-6">
        <h3 className="text-xl mb-2">Story:</h3>
        <div className="border rounded p-4 bg-gray-100 max-h-96 overflow-y-auto">
          {gameState.storyMessages.map((message, index) => (
            <div key={index} className={`mb-4 ${message.sender === gameState.aiRole ? 'text-blue-600' : 'text-green-600'}`}>
              <strong>{message.sender}:</strong> {message.content}
              <button
                onClick={() => generateAndPlayAudio(index)}
                className={`ml-2 text-gray-500 hover:text-gray-700 ${isGeneratingAudio ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isGeneratingAudio}
              >
                🔊
              </button>
              <button
                onClick={() => generateImage(index)}
                className={`ml-2 text-gray-500 hover:text-gray-700 ${isGeneratingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isGeneratingImage}
              >
                🖼️
              </button>
              {message.imageFile && (
                <div className="mt-2">
                  <img src={`http://localhost:3000${message.imageFile}`} alt="Generated scene" className="max-w-full h-auto" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="App p-4 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">AI DungeonMaster</h1>
      
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

      {!gameState && renderInitialScreen()}
      {gameState && renderGameInterface()}
    </div>
  );
}

export default App;