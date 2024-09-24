import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [playerRole, setPlayerRole] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [action, setAction] = useState('');
  const [gameState, setGameState] = useState(null);
  const [aiModels, setAiModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('gpt3');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGameState();
    fetchAiModels();
  }, []);

  const fetchAiModels = async () => {
    try {
      const response = await axios.get('http://localhost:3000/ai-models');
      console.log('AI Models:', response.data);
      setAiModels(response.data.models);
    } catch (error) {
      console.error('Error fetching AI models:', error);
      setError('Failed to fetch AI models');
    }
  };

  const initGame = async (role) => {
    try {
      console.log(`Initializing game with role: ${role} and model: ${selectedModel}`);
      const response = await axios.post('http://localhost:3000/init-game', { 
        playerRole: role,
        aiModel: selectedModel
      });
      console.log('Game initialized:', response.data);
      setGameState(response.data.gameState);
      setPlayerRole(role);
      setError(null);
    } catch (error) {
      console.error('Error initializing game:', error);
      setError('Failed to initialize game');
    }
  };

  const addPlayer = async () => {
    try {
      const response = await axios.post('http://localhost:3000/add-player', { playerName });
      console.log('Player added:', response.data);
      setPlayerName('');
      fetchGameState();
    } catch (error) {
      console.error('Error adding player:', error);
      setError('Failed to add player');
    }
  };

  const submitAction = async () => {
    try {
      const response = await axios.post('http://localhost:3000/story', { 
        action, 
        sender: playerRole === 'DM' ? 'DM' : 'Player'
      });
      console.log('Action submitted:', response.data);
      setGameState(response.data.gameState);
      setAction('');
    } catch (error) {
      console.error('Error submitting action:', error);
      setError('Failed to submit action');
    }
  };

  const fetchGameState = async () => {
    try {
      const response = await axios.get('http://localhost:3000/game-state');
      console.log('Fetched game state:', response.data);
      setGameState(response.data);
    } catch (error) {
      console.error('Error fetching game state:', error);
      setError('Failed to fetch game state');
    }
  };


  const modelDescriptions = {
    'gpt4o': 'GPT-4o - Most advanced, best for complex scenarios',
    'gpt4o-mini': 'GPT-4o Mini - Powerful and efficient, good balance for RPG',
    'gpt4-turbo': 'GPT-4 Turbo - High performance, great for detailed narratives',
    'gpt4': 'GPT-4 - Very capable, excellent for rich storytelling',
    'gpt35-turbo': 'GPT-3.5 Turbo - Fast and capable, good for most RPG scenarios'
  };

  return (
    <div className="App p-4 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">AI DungeonMaster</h1>
      
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

      {!playerRole && (
        <div className="mb-6">
          <h2 className="text-xl mb-2">Choose your role and AI model:</h2>
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
            className="p-2 border rounded mr-2 w-full mb-2"
          >
            {Object.entries(modelDescriptions).map(([model, description]) => (
              <option key={model} value={model}>{model.toUpperCase()} - {description}</option>
            ))}
          </select>
          <button className="bg-blue-500 text-white px-4 py-2 mr-2 rounded" onClick={() => initGame('DM')}>Dungeon Master</button>
          <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={() => initGame('Player')}>Player</button>
        </div>
      )}

      {playerRole && gameState && (
        <>
          <div className="mb-6">
            <h2 className="text-xl mb-2">Game State:</h2>
            <p>Your Role: {gameState.playerRole}</p>
            <p>AI Role: {gameState.aiRole}</p>
            <p>AI Model: {gameState.aiModel}</p>
            <p>Players: {gameState.players.join(', ')}</p>
          </div>

          {playerRole === 'DM' && (
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
            <h2 className="text-2xl mb-4">Story:</h2>
            <div className="border rounded p-4 bg-gray-100 max-h-96 overflow-y-auto">
              {gameState.storyMessages.map((message, index) => (
                <div key={index} className={`mb-4 ${message.sender === gameState.aiRole ? 'text-blue-600' : 'text-green-600'}`}>
                  <strong>{message.sender}:</strong> {message.content}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;