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
import { useTranslation } from 'react-i18next'; 
import api from '../services/api';
import { getRandomBackground } from '../utils/backgroundUtils';
import KidsModeToggle from '../controls/KidsModeToggle'; 
import { useKidsMode } from '../KidsModeContext';

// Supported languages
const supportedLanguages = ['pt-br', 'en', 'es', 'de', 'it', 'fr'];

const UserInterface = ({ user, onLogout, userGames, onLoadGame, onInitGame }) => {
  const { t, i18n } = useTranslation();
  const systemLanguage = supportedLanguages.includes(navigator.language.toLowerCase()) 
    ? navigator.language.toLowerCase() 
    : 'pt-br';

  const [backgroundImage, setBackgroundImage] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [kidsTheme, setKidsTheme] = useState('Fairy Tale Kingdom');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [aiModels, setAiModels] = useState([]);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [language, setLanguage] = useState(systemLanguage); // Default language based on system language
  const { darkMode, toggleTheme } = useTheme();
  const { isKidsMode } = useKidsMode();
  const [imageStyle, setImageStyle] = useState(isKidsMode ? 'cartoon' : 'fantasy illustration');

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
    border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
  }));

  const AlternatingListItem = styled(ListItem)(({ theme, index }) => ({
    backgroundColor: index % 2 === 0 
      ? (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)')
      : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'),
  }));

  useEffect(() => {
    setBackgroundImage(getRandomBackground(isKidsMode));
    fetchAiModels();
    fetchAvailableVoices();
  }, []);

  useEffect(() => {
    i18n.changeLanguage(language.replace('-',''));  // Change the language based on selection
  }, [language]); 

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
      setSelectedVoice(isKidsMode ? 'fable' : 'onyx');
    } catch (error) {
      console.error('Error fetching available voices:', error);
    }
  };

  return (
    <UserInterfaceContainer elevation={3}>
      <ContentContainer>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" gutterBottom>
            {t('welcome', { username: user.username })}  
          </Typography>
          <KidsModeToggle />
          {!isKidsMode && <IconButton onClick={toggleTheme} color="inherit">
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>}
        </Box>
        <Button onClick={onLogout} variant="contained" color="secondary">
          {t('logout')}
        </Button>

        <Typography variant="h5" gutterBottom>
          {t('yourGames')}
        </Typography>
        <GamesList>
          {userGames.map((game, index) => (
            <AlternatingListItem key={game._id} button onClick={() => onLoadGame(game._id)} index={index}>
              <ListItemText 
                primary={game.title} 
                secondary={new Date(game.updatedAt).toLocaleString()} 
              />
            </AlternatingListItem>
          ))}
        </GamesList>

        <Typography variant="h5" gutterBottom>
          {t('startNewGame')}
        </Typography>
        {!isKidsMode && 
          <FormControl fullWidth margin="normal">
            <InputLabel>{t('aiModel')}</InputLabel>
            <Select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {aiModels.map(model => (
                <MenuItem key={model} value={model}>{model.toUpperCase()}</MenuItem>
              ))}
            </Select>
          </FormControl>
        }

        {/* Controls in a Single Line */}
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
          <FormControl fullWidth margin="normal">
            <InputLabel>{t('imageStyle')}</InputLabel>
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
            <InputLabel>{t('voice')}</InputLabel>
            <Select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
            >
              {availableVoices.map(voice => (
                <MenuItem key={voice} value={voice}>{voice}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>{t('language')}</InputLabel>
            <Select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {supportedLanguages.map(lang => (
                <MenuItem key={lang} value={lang}>
                  {lang.toUpperCase()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <FormControl fullWidth margin="normal">
          <InputLabel>{t('theme')}</InputLabel>
          <Select
            value={kidsTheme}
            onChange={(e) => setKidsTheme(e.target.value)}
          >
            {['Enchanted Forest Adventures', 'Space Exploration', 'Pirate Treasure Hunt', 
              'Knight and Dragon Friend', 'Fairy Tale Kingdom'].map(style => (
              <MenuItem key={style} value={style}>{t(style.toLowerCase().replace(/ /g, ''))}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {!isKidsMode && <Button 
          onClick={() => onInitGame('DM', selectedModel, imageStyle, selectedVoice)} 
          variant="contained" 
          color="primary"
          fullWidth
          style={{ marginTop: '20px' }}
        >
          {t('newGameDM')}
        </Button>}
        <Button 
          onClick={() => onInitGame('Player', selectedModel, imageStyle, selectedVoice)} 
          variant="contained" 
          color="primary"
          fullWidth
          style={{ marginTop: '10px' }}
        >
          {`${t('newGame')} ${!isKidsMode ? t('asPlayer') : ""}`}
        </Button>
      </ContentContainer>
    </UserInterfaceContainer>
  );
};

export default UserInterface;
