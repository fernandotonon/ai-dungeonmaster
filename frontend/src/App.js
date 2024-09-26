import React, { useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { Container, Typography } from '@mui/material';
import AuthInterface from './components/AuthInterface';
import UserInterface from './components/UserInterface';
import GameInterface from './components/GameInterface';
import ErrorAlert from './components/ErrorAlert';
import api from './services/api';

const AppContainer = styled(Container)(({ theme }) => ({
  maxWidth: '800px',
  margin: '0 auto',
  padding: theme.spacing(2),
}));

const Title = styled(Typography)(({ theme }) => ({
  fontSize: '2.5rem',
  color: theme.palette.primary.main,
  marginBottom: theme.spacing(2),
}));

function App() {
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);
  const [userGames, setUserGames] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserGames();
    }
  }, []);

  const fetchUserGames = async () => {
    try {
      const response = await api.game.getUserGames();
      setUserGames(response.data);
    } catch (error) {
      console.error('Error fetching user games:', error);
      setError('Failed to fetch user games');
    }
  };

  const handleLogin = (userId, username) => {
    setUser({ id: userId, username });
    fetchUserGames();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setGameState(null);
    setUserGames([]);
  };

  const clearError = () => {
    setError(null);
  };

  const handleInitGame = async (role, selectedModel, imageStyle, selectedVoice) => {
    try {
      const response = await api.game.initGame(
        role,
        selectedModel,
        imageStyle,
        selectedVoice,
        `New Game ${userGames.length + 1}`
      );
      setGameState(response.data.gameState);
      setError(null);
    } catch (error) {
      console.error('Error initializing game:', error);
      setError('Failed to initialize game');
    }
  };

  const handleLoadGame = async (gameId) => {
    try {
      const response = await api.game.loadGame(gameId);
      setGameState(response.data.gameState);
    } catch (error) {
      console.error('Error loading game:', error);
      setError('Failed to load game');
    }
  };

  return (
    <AppContainer>
      <Title variant="h1">AI DungeonMaster</Title>
      
      <ErrorAlert error={error} clearError={clearError} />

      {!user && <AuthInterface onLogin={handleLogin} setError={setError} />}
      {user && !gameState && (
        <UserInterface
          user={user}
          onLogout={handleLogout}
          userGames={userGames}
          onLoadGame={handleLoadGame}
          onInitGame={handleInitGame}
          setError={setError}
        />
      )}
      {user && gameState && (
        <GameInterface
          gameState={gameState}
          setGameState={setGameState}
          onBackToGameList={() => {
            setGameState(null);
            fetchUserGames();
          }}
          setError={setError}
        />
      )}
    </AppContainer>
  );
}

export default App;