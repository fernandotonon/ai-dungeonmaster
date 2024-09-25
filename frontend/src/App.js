import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [gameState, setGameState] = useState(null);
  const [savedGames, setSavedGames] = useState([]);
  const [isCreatingNewGame, setIsCreatingNewGame] = useState(false);
  const [newGameTitle, setNewGameTitle] = useState('');
  const [playerRole, setPlayerRole] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [action, setAction] = useState('');
  const [aiModels, setAiModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('gpt4o-mini');
  const [error, setError] = useState(null);
  const [audioPlayer] = useState(new Audio());
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const modelDescriptions = {
    'gpt4o': 'GPT-4o - Most advanced, best for complex scenarios',
    'gpt4o-mini': 'GPT-4o Mini - Powerful and efficient, good balance for RPG',
    'gpt4-turbo': 'GPT-4 Turbo - High performance, great for detailed narratives',
    'gpt4': 'GPT-4 - Very capable, excellent for rich storytelling',
    'gpt35-turbo': 'GPT-3.5 Turbo - Fast and capable, good for most RPG scenarios'
  };

  useEffect(() => {
    fetchSavedGames();
    fetchAiModels();
  }, []);

  const fetchSavedGames = async () => {
    try {
      const response = await axios.get('http://localhost:3000/saved-games');
      setSavedGames(response.data);
    } catch (error) {
      console.error('Error fetching saved games:', error);
      setError('Failed to fetch saved games');
    }
  };

  const fetchAiModels = async () => {
    try {
      const response = await axios.get('http://localhost:3000/ai-models');
      setAiModels(response.data.models);
    } catch (error) {
      console.error('Error fetching AI models:', error);
      setError('Failed to fetch AI models');
    }
  };

  const initNewGame = async () => {
    try {
      const response = await axios.post('http://localhost:3000/init-game', { 
        playerRole,
        aiModel: selectedModel,
        title: newGameTitle
      });
      setGameState(response.data.gameState);
      setIsCreatingNewGame(false);
      setNewGameTitle('');
      fetchSavedGames(); // Refresh the list of saved games
    } catch (error) {
      console.error('Error initializing game:', error);
      setError('Failed to initialize game');
    }
  };

  const loadGame = async (gameId) => {
    try {
      const response = await axios.get(`http://localhost:3000/load-game/${gameId}`);
      setGameState(response.data.gameState);
      setPlayerRole(response.data.gameState.playerRole);
    } catch (error) {
      console.error('Error loading game:', error);
      setError('Failed to load game');
    }
  };

  const addPlayer = async () => {
    try {
      const response = await axios.post('http://localhost:3000/add-player', { playerName });
      setPlayerName('');
      setGameState(response.data.gameState);
      fetchSavedGames(); // Refresh the list of saved games
    } catch (error) {
      console.error('Error adding player:', error);
      setError('Failed to add player');
    }
  };

  const submitAction = async () => {
    try {
      const response = await axios.post('http://localhost:3000/story', { 
        action, 
        sender: playerRole
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
      <button 
        onClick={() => setIsCreatingNewGame(true)} 
        className="bg-green-500 text-white px-4 py-2 rounded mr-2"
      >
        Create New Story
      </button>
      <h3 className="text-xl font-bold mt-6 mb-2">Saved Games:</h3>
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

  const renderNewGameSetup = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4">Create New Story</h2>
      <input 
        type="text"
        value={newGameTitle}
        onChange={(e) => setNewGameTitle(e.target.value)}
        placeholder="Enter story title"
        className="border p-2 mr-2 rounded w-full mb-4"
      />
      <h3 className="text-xl mb-2">Choose your role and AI model:</h3>
      <select 
        value={selectedModel} 
        onChange={(e) => setSelectedModel(e.target.value)}
        className="p-2 border rounded mr-2 w-full mb-2"
      >
        {Object.entries(modelDescriptions).map(([model, description]) => (
          <option key={model} value={model}>{model.toUpperCase()} - {description}</option>
        ))}
      </select>
      <div className="mt-4">
        <button className="bg-blue-500 text-white px-4 py-2 mr-2 rounded" onClick={() => setPlayerRole('DM')}>Dungeon Master</button>
        <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={() => setPlayerRole('Player')}>Player</button>
      </div>
      {playerRole && (
        <button 
          onClick={initNewGame} 
          className="bg-red-500 text-white px-4 py-2 rounded mt-4"
        >
          Start New Game
        </button>
      )}
    </div>
  );

  const generateAndPlayAudio = async (messageIndex) => {
    if (isGeneratingAudio) return;

    setIsGeneratingAudio(true);
    try {
      const response = await axios.post('http://localhost:3000/generate-audio', { messageIndex });
      const audioFile = response.data.audioFile;
      const audioUrl = `http://localhost:3000/audio/${audioFile.split('/').pop()}`;
      audioPlayer.src = audioUrl;
      audioPlayer.play();
      
      // Update the game state with the new audio file
      const updatedGameState = { ...gameState };
      updatedGameState.storyMessages[messageIndex].audioFile = audioFile;
      setGameState(updatedGameState);
    } catch (error) {
      console.error('Error generating audio:', error);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const generateImage = async (messageIndex) => {
    if (isGeneratingImage) return;

    setIsGeneratingImage(true);
    try {
      const message = gameState.storyMessages[messageIndex];
      const response = await axios.post('http://localhost:3000/generate-image', { 
        prompt: message.content,
        messageIndex 
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

  const renderGameInterface = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4">{gameState.title || 'Untitled Story'}</h2>
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
                <img src={`http://localhost:3000${message.imageFile}`} alt="Generated scene" className="mt-2 max-w-full h-auto" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <textarea
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Enter your action or narrative..."
          className="w-full h-32 p-2 border mb-2 rounded"
        />
        <button onClick={submitAction} className="bg-red-500 text-white px-4 py-2 rounded">Submit Action</button>
      </div>

      <button onClick={() => { setGameState(null); fetchSavedGames(); }} className="bg-yellow-500 text-white px-4 py-2 rounded mt-4">
        Back to Main Menu
      </button>
    </div>
  );

  return (
    <div className="App p-4 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">AI DungeonMaster</h1>
      
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

      {!gameState && !isCreatingNewGame && renderInitialScreen()}
      {!gameState && isCreatingNewGame && renderNewGameSetup()}
      {gameState && renderGameInterface()}
    </div>
  );
}

export default App;