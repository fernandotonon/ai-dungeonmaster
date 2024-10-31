import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { game } from '../services/api';

const JoinGame = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const joinGame = async () => {
      try {
        const response = await game.joinGame(gameId, 'Player');
        navigate(`/game/${gameId}`, { state: { gameState: response.data.gameState } });
      } catch (error) {
        setError(error.response?.data?.error || 'Failed to join game');
      } finally {
        setLoading(false);
      }
    };

    joinGame();
  }, [gameId, navigate]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" mt={4}>
        <Typography color="error" gutterBottom>{error}</Typography>
        <Button variant="contained" onClick={() => navigate('/')}>
          {t('back_to_home')}
        </Button>
      </Box>
    );
  }

  return null;
};

export default JoinGame;