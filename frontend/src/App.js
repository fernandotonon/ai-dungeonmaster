import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { Container } from '@mui/material';
import AuthInterface from './components/AuthInterface';
import UserInterface from './components/UserInterface';
import GameInterface from './components/GameInterface';
import JoinGame from './components/JoinGame';
import ErrorAlert from './components/ErrorAlert';
import api from './services/api';
import { useTranslation } from 'react-i18next'; 
import { useKidsMode } from './contexts/KidsModeContext';
import CookieConsent from './components/CookieConsent';
import ServerStatus from './components/ServerStatus';
import { useSocket } from './contexts/SocketContext';

const AppContainer = styled(Container)(({ theme }) => ({
  height: '100%',
  margin: '0 auto',
  padding: theme.spacing(2),
}));

function MainApp() {
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);
  const [userGames, setUserGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation();
  const { isKidsMode } = useKidsMode();
  const [availableVoices, setAvailableVoices] = useState([]);
  const { isServerDown } = useSocket();
  const { gameId } = useParams();

  const supportedLanguages = ['pt-br', 'en', 'es', 'de', 'it', 'fr'];
  const systemLanguage = supportedLanguages.includes(navigator.language.toLowerCase()) 
    ? navigator.language.toLowerCase() 
    : 'pt-br';

  useEffect(() => {
    checkLoginStatus();
    i18n.changeLanguage(systemLanguage.replace('-','')); 
  }, []);

  useEffect(() => {
    if (gameId && user) {
      handleLoadGame(gameId);
    }
  }, [gameId, user]);

  const checkLoginStatus = async () => {
    try {
      const response = await api.auth.checkLoginStatus();
      if (response.user) {
        setUser(response.user);
        await fetchUserGames();
      }
    } catch (error) {
      console.error('Failed to check login status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserGames = async () => {
    try {
      const response = await api.game.getUserGames();
      setUserGames(response.data);
    } catch (error) {
      console.error('Error fetching user games:', error);
      setError('Failed to fetch user games');
    }
  };

  const handleLogin = async (userData) => {
    setUser(userData);
    await fetchUserGames();
  };

  const handleLogout = async () => {
    await api.auth.logout(); 
    setUser(null);
    setGameState(null);
    setUserGames([]);
  };

  const clearError = () => {
    setError(null);
  };

  const handleInitGame = async ({role, title, selectedModel, imageStyle, selectedVoice, language, storyTheme, isKidsMode}) => {
    try {
      const response = await api.game.initGame(
        {
          playerRole: role, 
          aiModel: selectedModel, 
          imageStyle, 
          voice: selectedVoice, 
          title: title || `${t('newGame')} ${userGames.length + 1}`, 
          storyTheme,
          isKidsMode,
          language
        }
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

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AppContainer maxWidth="xl">
      <ServerStatus isServerDown={isServerDown} />
      <ErrorAlert error={error} clearError={clearError} />
      {!user && <AuthInterface onLogin={handleLogin} setError={setError} />}
      {user && !gameState && (
        <UserInterface
          user={user}
          onLogout={handleLogout}
          userGames={userGames}
          onUpdateGames={setUserGames}
          onLoadGame={handleLoadGame}
          onInitGame={handleInitGame}
          setError={setError}
          availableVoices={availableVoices}
          setAvailableVoices={setAvailableVoices}
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
          availableVoices={availableVoices}
          user={user}
        />
      )}
      <CookieConsent />
    </AppContainer>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/join/:gameId" element={<JoinGame />} />
        <Route path="/game/:gameId" element={<MainApp />} />
        <Route path="/" element={<MainApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;