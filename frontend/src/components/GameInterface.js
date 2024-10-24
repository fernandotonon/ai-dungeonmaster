import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  TextField,
  Button, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  IconButton,
  Typography,
  Paper,
  Grid2,
  Box
} from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useTheme } from '../ThemeContext';
import { useKidsMode } from '../KidsModeContext';
import { useTranslation } from 'react-i18next'; 
import api from '../services/api';
import ActionInput from '../controls/ActionInput';
import { getRandomBackground } from '../utils/backgroundUtils';
import FullscreenImageViewer from './FullscreenImageViewer';
import MessageList from './MessageList';

const GameInterface = ({ gameState, setGameState, onBackToGameList, setError, availableVoices }) => {
  const { t, i18n } = useTranslation(); 
  const [backgroundImage, setBackgroundImage] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);  // To manage audio playback
  const { darkMode, toggleTheme } = useTheme();
  const { isKidsMode } = useKidsMode();
  const [mediaUrls, setMediaUrls] = useState({ images: {}, audios: {} });
  const loadingFilesRef = useRef(new Set());
  const [fullscreenImage, setFullscreenImage] = useState(null);

  const GameContainer = styled(Paper)(({ theme }) => ({
    padding: '20px',
    marginTop: '20px',
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

  const StoryContainer = styled(Paper)(({ theme }) => ({
    maxHeight: '400px',
    overflowY: 'auto',
    padding: '10px',
    marginTop: '20px',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)',
  }));

  useEffect(() => {
    setBackgroundImage(getRandomBackground(isKidsMode));
    return () => {
      Object.values(mediaUrls.images).forEach(URL.revokeObjectURL);
      Object.values(mediaUrls.audios).forEach(URL.revokeObjectURL);
    };
  }, []);

  // Function to validate cached file
  const validateCachedFile = async (url, fileType) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return false;

      const blob = await response.blob();
      
      // Check if the blob is of the expected type
      if (fileType === 'images' && !blob.type.startsWith('image/')) return false;
      if (fileType === 'audios' && !blob.type.startsWith('audio/')) return false;

      // Check if the blob has content
      if (blob.size === 0) return false;

      return true;
    } catch (error) {
      console.error('Error validating cached file:', error);
      return false;
    }
  };

  const loadMediaFile = useCallback(async (fileType, fileName) => {
    if (mediaUrls[fileType][fileName] || loadingFilesRef.current.has(fileName)) return;

    loadingFilesRef.current.add(fileName);

    try {
      // Check if the file is in local storage
      const cachedFile = localStorage.getItem(`${fileType}_${fileName}`);
      
      if (cachedFile) {
        // Validate the cached file
        const isValid = await validateCachedFile(cachedFile, fileType);
        
        if (isValid) {
          // If the file is cached and valid, use it
          setMediaUrls(prev => ({
            ...prev,
            [fileType]: { ...prev[fileType], [fileName]: cachedFile }
          }));
          return;
        }
        // If not valid, remove it from localStorage
        localStorage.removeItem(`${fileType}_${fileName}`);
      }
      
      // If not cached or not valid, fetch from server
      const url = await (fileType === 'images' 
        ? api.ai.getImageFile(fileName)
        : api.ai.getAudioFile(fileName));

      // Store in local storage
      localStorage.setItem(`${fileType}_${fileName}`, url);

      setMediaUrls(prev => ({
        ...prev,
        [fileType]: { ...prev[fileType], [fileName]: url }
      }));
    } catch (error) {
      console.error(`Error loading ${fileType} ${fileName}:`, error);
    } finally {
      loadingFilesRef.current.delete(fileName);
    }
  }, [mediaUrls]);

  useEffect(() => {
    const loadImagesAndAudios = async () => {
      const promises = gameState.storyMessages.map(async (message) => {
        if (message.imageFile && !mediaUrls.images[message.imageFile] && !loadingFilesRef.current.has(message.imageFile)) {
          await loadMediaFile('images', message.imageFile);
        }
        if (message.audioFile && !mediaUrls.audios[message.audioFile] && !loadingFilesRef.current.has(message.audioFile)) {
          await loadMediaFile('audios', message.audioFile);
        }
      });

      await Promise.all(promises);
    };

    loadImagesAndAudios();
  }, [gameState.storyMessages, loadMediaFile, mediaUrls]);
  
  // Add a cleanup function to manage local storage
  useEffect(() => {
    const cleanupLocalStorage = () => {
      const storageLimit = 50 * 1024 * 1024; // 50 MB limit
      let totalSize = 0;
      const items = { ...localStorage };
  
      // Calculate total size and sort items by age
      const sortedItems = Object.entries(items)
        .filter(([key]) => key.startsWith('images_') || key.startsWith('audio_'))
        .map(([key, value]) => {
          totalSize += value.length;
          return { key, size: value.length, time: localStorage.getItem(`${key}_time`) || Date.now() };
        })
        .sort((a, b) => a.time - b.time);
  
      // Remove oldest items if total size exceeds the limit
      while (totalSize > storageLimit && sortedItems.length) {
        const item = sortedItems.shift();
        localStorage.removeItem(item.key);
        localStorage.removeItem(`${item.key}_time`);
        totalSize -= item.size;
      }
    };
  
    // Run cleanup when component mounts
    cleanupLocalStorage();
  
    // Set up interval to run cleanup periodically (e.g., every hour)
    const cleanupInterval = setInterval(cleanupLocalStorage, 60 * 60 * 1000);
  
    return () => clearInterval(cleanupInterval);
  }, []);

  const handleUpdatePreferences = async (newImageStyle, newVoice) => {
    try {
      const response = await api.game.updatePreferences(gameState._id, newImageStyle, newVoice);
      setGameState(response.data.gameState);
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  const handleAddPlayer = async () => {
    try {
      const response = await api.game.addPlayer(gameState._id, playerName);
      setPlayerName('');
      setGameState(response.data.gameState);
    } catch (error) {
      console.error('Error adding player:', error);
    }
  };

  const handleSubmitAction = async (text) => {
    try {
      const response = await api.ai.submitStory(gameState._id, text, gameState.playerRole, isKidsMode, i18n.language);
      setGameState(response.data.gameState);
    } catch (error) {
      console.error('Error submitting action:', error);
      setError('Failed to submit action. Please try again.');
    }
  };

  const handleGenerateImage = useCallback(async (messageIndex) => {
    if (isGeneratingImage) return;
    setIsGeneratingImage(true);
    try {
      const response = await api.ai.generateImage(gameState._id, messageIndex, gameState.imageStyle, isKidsMode, gameState.storyTheme);
      const updatedGameState = { ...gameState };
      updatedGameState.storyMessages[messageIndex].imageFile = response.data.imageUrl;
      loadMediaFile('images', response.data.imageUrl)
      setGameState(updatedGameState);
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  }, [gameState.storyMessages, setGameState]);

  const handleGenerateAudio = useCallback(async (messageIndex) => {
    if (isGeneratingAudio) return;
    setIsGeneratingAudio(true);
    try {
      const response = await api.ai.generateAudio({gameId: gameState._id, messageIndex, voice: gameState.voice, language: i18n.language});
      const audioFile = response.data.audioFile;

      loadMediaFile('audios', audioFile)
      setCurrentAudio(audioFile); // Set the current audio file for playback
      setGameState(prevState => {
        const updatedMessages = [...prevState.storyMessages];
        updatedMessages[messageIndex].audioFile = audioFile;
        return { ...prevState, storyMessages: updatedMessages };
      });
    } catch (error) {
      console.error('Error generating audio:', error);
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [gameState.storyMessages, setGameState]);

  const handleImageClick = useCallback((imageUrl) => {
    setFullscreenImage(imageUrl);
  }, []);

  const handleCloseFullscreen = () => {
    setFullscreenImage(null);
  };

  return (
    <GameContainer elevation={3}>
      <ContentContainer>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" gutterBottom>
            {gameState.title || t('untitled_story')}
          </Typography>
          {!isKidsMode && <IconButton onClick={toggleTheme} color="inherit">
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>}
        </Box>
        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} height="100%">
          <Box>
            <Box 
              display="flex" 
              justifyContent="space-between" 
              alignItems="stretch" 
              gap={2} 
              flexDirection={{ xs: 'row', md: 'column' }}
            >
              <Box>
                <FormControl fullWidth>
                  <InputLabel>{t('image_style')}</InputLabel>
                  <Select
                    value={gameState.imageStyle}
                    onChange={(e) => handleUpdatePreferences(e.target.value, gameState.voice)}
                  >
                    {['photo-realistic', 'cartoon', 'anime', 'hand-drawn', 'pixel art', 
                      'fantasy illustration', 'oil painting', 'watercolor'].map(style => (
                      <MenuItem key={style} value={style}>{style}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <FormControl fullWidth>
                  <InputLabel>{t('voice')}</InputLabel>
                  <Select
                    value={gameState.voice}
                    onChange={(e) => handleUpdatePreferences(gameState.imageStyle, e.target.value)}
                  >
                    {availableVoices.map(voice => (
                      <MenuItem key={voice} value={voice.toLowerCase()}>{voice}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              {!isKidsMode && <Box display="flex" justifyContent="space-around" alignItems="left" flexDirection="column">
                <Typography variant="body2" >
                {t('your_role')}: {gameState.playerRole}
                </Typography>
                <Typography variant="body2" >
                {t('ai_role')}: {gameState.aiRole}
                </Typography>
              </Box>}
              {!isKidsMode && <Box display="flex" justifyContent="space-around" alignItems="left" flexDirection="column">
                <Typography variant="body2" >
                  {t('ai_model')}: {gameState.aiModel}
                </Typography>
                <Typography variant="body2" >
                  {t('theme')}: {gameState.storyTheme}
                </Typography>
              </Box>}
            </Box>


            {gameState.players.length > 0 && 
                <Typography variant="body1" gutterBottom>
                  {t('players')}: {gameState.players.join(', ')}
                </Typography>
              }

            {!isKidsMode && gameState.playerRole === 'DM' && (
              <Grid2 container spacing={2} style={{ marginTop: '20px' }}>
                <Grid2 item xs={12} sm={8}>
                  <TextField
                    label={t('player_name')}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    fullWidth
                  />
                </Grid2>
                <Grid2 item xs={12} sm={4}>
                  <Button 
                    onClick={handleAddPlayer} 
                    variant="contained" 
                    color="secondary"
                    fullWidth
                  >
                    {t('add_player')}
                  </Button>
                </Grid2>
              </Grid2>
            )}
          </Box>
          <Box display="flex" flexDirection="column" height="100%">
            <StoryContainer elevation={2} >
              <MessageList
                gameState={gameState}
                mediaUrls={mediaUrls}
                loadingFiles={loadingFilesRef.current}
                handleGenerateAudio={handleGenerateAudio}
                handleGenerateImage={handleGenerateImage}
                handleImageClick={handleImageClick}
                handleSubmitAction={handleSubmitAction}
                isGeneratingAudio={isGeneratingAudio}
                isGeneratingImage={isGeneratingImage}
              />
              <FullscreenImageViewer 
                open={!!fullscreenImage} 
                onClose={handleCloseFullscreen} 
                imageUrl={fullscreenImage} 
              />
            </StoryContainer>
            <ActionInput 
              onSubmit={handleSubmitAction} 
              setError={setError}
              gameState={gameState}
            />
          </Box>
        </Box>
        <Button 
          onClick={onBackToGameList} 
          variant="contained" 
          color="secondary"
          style={{ marginTop: '20px' }}
        >
          {t('back_to_game_list')}
        </Button>
      </ContentContainer>
    </GameContainer>
  );
};

export default GameInterface;
