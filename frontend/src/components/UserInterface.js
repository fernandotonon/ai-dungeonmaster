import React, { useState, useEffect, useRef } from 'react';
import { 
  Button, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  List, 
  ListItem, 
  Paper,
  IconButton,
  Box,
  Typography,
} from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next'; 
import api from '../services/api';
import { getRandomBackground } from '../utils/backgroundUtils';
import KidsModeToggle from '../controls/KidsModeToggle'; 
import { useKidsMode } from '../KidsModeContext';
import EditableGameTitle from '../controls/EditableGameTitleInput';
import TextInput from '../controls/TextInput';

// Supported languages
const supportedLanguages = ['pt-br', 'en', 'es', 'de', 'it', 'fr'];

const UserInterface = ({ 
  user, 
  onLogout, 
  userGames, 
  onUpdateGames,
  onLoadGame, 
  onInitGame, 
  availableVoices, 
  setAvailableVoices
}) => {
  const { t, i18n } = useTranslation();
  const systemLanguage = supportedLanguages.includes(navigator.language.toLowerCase()) 
    ? navigator.language.toLowerCase() 
    : 'pt-br';

  const [backgroundImage, setBackgroundImage] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [aiModels, setAiModels] = useState([]);
  const [language, setLanguage] = useState(systemLanguage); // Default language based on system language
  const { darkMode, toggleTheme } = useTheme();
  const { isKidsMode } = useKidsMode();
  const newGameTitleRef = useRef(null);
  const [imageStyle, setImageStyle] = useState(isKidsMode ? 'cartoon' : 'fantasy illustration');
  const [storyTheme, setStoryTheme] = useState(isKidsMode ? 'Fairy Tale Kingdom' : 'Western');
  const kidsThemes = ['Enchanted Forest Adventures', 'Space Exploration', 'Pirate Treasure Hunt', 
    'Knight and Dragon Friend', 'Fairy Tale Kingdom'];
  const adultThemes = [
    'Alien',
    'Cyberpunk',
    'Dark Fantasy',
    'Feudal Japan/Samurai',
    'Medieval Fantasy',
    'Mythology/Folklore',
    'Pirate/High Seas Adventure',
    'Post-Apocalyptic',
    'Sci-Fi',
    'Space Opera',
    'Steampunk',
    'Underwater Adventure',
    'Vampire',
    'Western',
    'Zombie'
  ];

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
    minHeight: '200px',
    maxHeight: '600px',
    [theme.breakpoints.down('md')]: {
      maxHeight: '200px',
    },
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
  }, [isKidsMode]);

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

  const handleSaveGameTitle = async (game) => {
    try {
      await api.game.updateGame({gameId: game._id, title: game.title });
      // Update the game in the userGames array
      onUpdateGames(userGames.map(g => g._id === game._id ? {...g, ...game} : g));
    } catch (error) {
      console.error('Error updating game title:', error);
    }
  };

  const handleDeleteGame = async (gameId) => {
    try {
      await api.game.deleteGame(gameId);
      // Remove the game from the userGames array
      onUpdateGames(userGames.filter(g => g._id !== gameId));
    } catch (error) {
      console.error('Error deleting game:', error);
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

        <Box 
          display="flex" 
          justifyContent="space-between" 
          alignItems="stretch" 
          gap={2} 
          flexDirection={{ xs: 'column', md: 'row' }} 
        >
          <Box width="100%">
            <Typography variant="h5" gutterBottom>
            {t('yourGames')}
          </Typography>
          <GamesList>
            {userGames.map((game, index) => (
              <AlternatingListItem key={game._id} index={index}>
                <EditableGameTitle
                  game={game}
                  onSave={handleSaveGameTitle}
                  onLoadGame={onLoadGame}
                  onDelete={handleDeleteGame}
                />
              </AlternatingListItem>
            ))}
          </GamesList>
          </Box>
          <Box width="100%" display="flex" flexDirection="column" >
          <Typography variant="h5" gutterBottom>
            {t('startNewGame')}
          </Typography>
          <TextInput
              ref={newGameTitleRef}
              label={t('title')}
              initialValue={`${t('newGame')} ${userGames.length + 1}`}
            />
          <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
          <FormControl fullWidth margin="normal">
            <InputLabel>{t('theme')}</InputLabel>
            <Select
              value={storyTheme}
              onChange={(e) => setStoryTheme(e.target.value)}
            >
              {(isKidsMode ? kidsThemes : adultThemes).map(style => {
                return (
                <MenuItem key={style} value={style}>{t(style.toLowerCase().replace(/ /g, '').replace(/\//g, '').replace(/-/g, ''))}</MenuItem>
              )})}
            </Select>
          </FormControl>
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
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
          <FormControl fullWidth margin="normal">
            <InputLabel>{t('imageStyle')}</InputLabel>
            <Select
              value={imageStyle}
              onChange={(e) => setImageStyle(e.target.value)}
            >
              {['photo-realistic', 'cartoon', 'anime', 'hand-drawn', 'pixel art', 
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
        
        {!isKidsMode && <Button 
          onClick={() => onInitGame({role: 'DM', title: newGameTitleRef.current.getValue(), selectedModel, imageStyle, selectedVoice, language, isKidsMode})} 
          variant="contained" 
          color="primary"
          fullWidth
          style={{ marginTop: '20px' }}
        >
          {t('newGameDM')}
        </Button>}
        <Button 
          onClick={() => onInitGame({role: 'Player', title: newGameTitleRef.current.getValue(), selectedModel, imageStyle, selectedVoice, language, isKidsMode, storyTheme})} 
          variant="contained" 
          color="primary"
          fullWidth
          style={{ marginTop: '10px' }}
        >
          {`${t('newGame')} ${!isKidsMode ? t('asPlayer') : ""}`}
        </Button>
        </Box>
        </Box>
      </ContentContainer>
    </UserInterfaceContainer>
  );
};

export default UserInterface;
