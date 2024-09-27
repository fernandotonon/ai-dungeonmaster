import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  List, 
  ListItem, 
  ListItemText, 
  Paper,
  IconButton,
  Box,
  Typography
} from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useTheme } from '../ThemeContext';
import api from '../services/api';
import { getRandomBackground } from '../utils/backgroundUtils';

const UserInterface = ({ user, onLogout, userGames, onLoadGame, onInitGame }) => {
  const [backgroundImage, setBackgroundImage] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [imageStyle, setImageStyle] = useState('fantasy illustration');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [aiModels, setAiModels] = useState([]);
  const [availableVoices, setAvailableVoices] = useState([]);
  const { darkMode, toggleTheme } = useTheme();

  const UserInterfaceContainer = styled(Paper)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '20px',
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: theme.palette.text.primary,
  }));

  const ContentContainer = styled(Box)(({ theme }) => ({
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    padding: '20px',
    borderRadius: '8px',
  }));

  const GamesList = styled(List)(({ theme }) => ({
    maxHeight: '200px',
    overflowY: 'auto',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    borderRadius: '4px',
  }));

  useEffect(() => {
    setBackgroundImage(getRandomBackground());
    fetchAiModels();
    fetchAvailableVoices();
  }, []);

  const fetchAiModels = async () => {
    try {
      const response = await api.ai.getAIModels();
      setAiModels(response.data.models);
      setSelectedModel('gpt4o-mini');
    } catch (error) {
      console.error('Error fetching AI models:', error);
    }
  };

  const fetchAvailableVoices = async () => {
    try {
      const response = await api.ai.getAvailableVoices();
      setAvailableVoices(response.data.voices);
      setSelectedVoice('onyx');
    } catch (error) {
      console.error('Error fetching available voices:', error);
    }
  };

  return (
    <UserInterfaceContainer elevation={3}>
      <ContentContainer>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" gutterBottom>
            Welcome, {user.username}!
          </Typography>
          <IconButton onClick={toggleTheme} color="inherit">
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Box>
        <Button onClick={onLogout} variant="contained" color="secondary">
          Logout
        </Button>

        <Typography variant="h5" gutterBottom>
          Your Games:
        </Typography>
        <GamesList>
          {userGames.map((game) => (
            <ListItem key={game._id} button onClick={() => onLoadGame(game._id)}>
              <ListItemText 
                primary={game.title} 
                secondary={new Date(game.updatedAt).toLocaleString()} 
              />
            </ListItem>
          ))}
        </GamesList>

        <Typography variant="h5" gutterBottom>
          Start a new game:
        </Typography>
        <FormControl fullWidth margin="normal">
          <InputLabel>AI Model</InputLabel>
          <Select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {aiModels.map(model => (
              <MenuItem key={model} value={model}>{model.toUpperCase()}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth margin="normal">
          <InputLabel>Image Style</InputLabel>
          <Select
            value={imageStyle}
            onChange={(e) => setImageStyle(e.target.value)}
          >
            {['realistic', 'cartoon', 'anime', 'hand-drawn', 'pixel art', 
              'fantasy illustration', 'oil painting', 'watercolor'].map(style => (
              <MenuItem key={style} value={style}>{style}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth margin="normal">
          <InputLabel>Voice</InputLabel>
          <Select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
          >
            {availableVoices.map(voice => (
              <MenuItem key={voice} value={voice}>{voice}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button 
          onClick={() => onInitGame('DM', selectedModel, imageStyle, selectedVoice)} 
          variant="contained" 
          color="primary"
          fullWidth
          style={{ marginTop: '20px' }}
        >
          New Game as Dungeon Master
        </Button>
        <Button 
          onClick={() => onInitGame('Player', selectedModel, imageStyle, selectedVoice)} 
          variant="contained" 
          color="primary"
          fullWidth
          style={{ marginTop: '10px' }}
        >
          New Game as Player
        </Button>
      </ContentContainer>
    </UserInterfaceContainer>
  );
};

export default UserInterface;