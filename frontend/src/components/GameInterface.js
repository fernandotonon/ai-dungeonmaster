import React, { useState, useEffect, useCallback } from 'react';
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
  Box,
  CircularProgress
} from '@mui/material';
import { VolumeUp, Image, Brightness4, Brightness7 } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useTheme } from '../ThemeContext';
import { useKidsMode } from '../KidsModeContext';
import { useTranslation } from 'react-i18next'; 
import api from '../services/api';
import ActionInput from '../controls/ActionInput';
import { getRandomBackground } from '../utils/backgroundUtils';
import FullscreenImageViewer from './FullscreenImageViewer';

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
  const [loadingFiles, setLoadingFiles] = useState(new Set());
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

  const Message = styled(Box)(({ theme, sender, aiRole }) => ({
    marginBottom: '10px',
    padding: '10px',
    borderRadius: '4px',
    backgroundColor: sender === aiRole 
      ? theme.palette.mode === 'dark' ? 'rgba(0, 0, 255, 0.2)' : 'rgba(0, 0, 255, 0.1)'
      : theme.palette.mode === 'dark' ? 'rgba(0, 255, 0, 0.2)' : 'rgba(0, 255, 0, 0.1)',
  }));

  const ImageContainer = styled('div')`
    cursor: pointer;
    &:hover {
      opacity: 0.8;
    }
  `;

  useEffect(() => {
    setBackgroundImage(getRandomBackground(isKidsMode));
    return () => {
      Object.values(mediaUrls.images).forEach(URL.revokeObjectURL);
      Object.values(mediaUrls.audios).forEach(URL.revokeObjectURL);
    };
  }, []);

  const loadMediaFile = useCallback(async (fileType, fileName) => {
    if (mediaUrls[fileType][fileName] || loadingFiles.has(fileName)) return;

    setLoadingFiles(prev => new Set(prev).add(fileName));

    try {
      const url = await (fileType === 'images' 
        ? api.ai.getImageFile(fileName)
        : api.ai.getAudioFile(fileName));

      setMediaUrls(prev => ({
        ...prev,
        [fileType]: { ...prev[fileType], [fileName]: url }
      }));
    } catch (error) {
      console.error(`Error loading ${fileType} ${fileName}:`, error);
    } finally {
      setLoadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileName);
        return newSet;
      });
    }
  }, []);

  useEffect(() => {
    gameState.storyMessages.forEach(message => {
      if (message.imageFile) loadMediaFile('images', message.imageFile);
      if (message.audioFile) loadMediaFile('audios', message.audioFile);
    });
  }, [gameState.storyMessages, loadMediaFile]);


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

  const handleGenerateImage = async (messageIndex) => {
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
  };

  const handleGenerateAudio = async (messageIndex) => {
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
  };

  const extractJsonContent = (message, key, defaultValue) => {
    if( message.startsWith('```json')){
      const jsonContent = message.split('```json')[1].split('```')[0];
      return JSON.parse(jsonContent)[key] || defaultValue;
    } else {
      try {
        const parsedMessage = JSON.parse(message);
        if (parsedMessage && typeof parsedMessage === 'object' && parsedMessage.hasOwnProperty(key)) {
          return parsedMessage[key];
        }
      } catch (error) {
      }
    }
    return defaultValue;
  }

  const getMessageContent = (message) => {
    return extractJsonContent(message, 'content', message);
  }

  const getMessageOptions = (message) => {
    return extractJsonContent(message, 'options', []);
  }

  const handleImageClick = (imageUrl) => {
    setFullscreenImage(imageUrl);
  };

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
        
        <Grid2 container spacing={2}>
          <Grid2 item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>{t('image_style')}</InputLabel>
              <Select
                value={gameState.imageStyle}
                onChange={(e) => handleUpdatePreferences(e.target.value, gameState.voice)}
              >
                {['realistic', 'cartoon', 'anime', 'hand-drawn', 'pixel art', 
                  'fantasy illustration', 'oil painting', 'watercolor'].map(style => (
                  <MenuItem key={style} value={style}>{style}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid2>
          <Grid2 item xs={12} sm={6}>
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
          </Grid2>
        </Grid2>

        {!isKidsMode && <Box display="flex" justifyContent="space-around" alignItems="center" marginTop="10px">
          <Typography variant="body1" gutterBottom>
          {t('your_role')}: {gameState.playerRole}
          </Typography>
          <Typography variant="body1" gutterBottom>
          {t('ai_role')}: {gameState.aiRole}
          </Typography>
        </Box>}
        {!isKidsMode && 
          <Typography variant="body1" gutterBottom>
            {t('ai_model')}: {gameState.aiModel}
          </Typography>
        }
        {!isKidsMode && gameState.players.length > 0 && 
          <Typography variant="body1" gutterBottom>
            {t('players')}: {gameState.players.join(', ')}
          </Typography>
        }

        <Typography variant="body1" gutterBottom>
          {t('theme')}: {gameState.storyTheme}
        </Typography>

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

        <ActionInput 
          onSubmit={handleSubmitAction} 
          setError={setError}
          gameState={gameState}
        />

        <StoryContainer elevation={2}>
          {gameState.storyMessages.slice().reverse().map((message, index) => (
            <Message key={message.id} sender={message.sender} aiRole={gameState.aiRole}>
              {(index === 0) && getMessageOptions(message.content).map((option, index) => (
                <Button key={index} onClick={() => handleSubmitAction(option)}>
                  {option}
                </Button>
              ))}
              <Typography variant="subtitle1">
                <strong>{message.sender}:</strong> {getMessageContent(message.content)}
              </Typography>
              <Box display="flex" alignItems="center">
              {message.audioFile && (
                loadingFiles.has(message.audioFile) ? (
                  <CircularProgress size={24} />
                ) : mediaUrls.audios[message.audioFile] ? (
                  <audio controls src={mediaUrls.audios[message.audioFile]} />
                ) : ""
              )}
              {!message.audioFile && (
                <IconButton 
                  onClick={() => handleGenerateAudio(gameState.storyMessages.length - index - 1)}
                  disabled={isGeneratingAudio}
                >
                  <VolumeUp />
                </IconButton>
              )}
              {!message.imageFile && <IconButton 
                    onClick={() => handleGenerateImage(gameState.storyMessages.length - index - 1)}
                    disabled={isGeneratingImage}
                    style={{ marginLeft: '15px' }}  // Add spacing between audio and image buttons
                  >
                    <Image />
                  </IconButton>  }
              </Box>
              {message.imageFile && (
                loadingFiles.has(message.imageFile) ? (
                  <CircularProgress size={24} />
                ) : mediaUrls.images[message.imageFile] ? (
                  <ImageContainer onClick={() => handleImageClick(mediaUrls.images[message.imageFile])}>
                    <img 
                      src={mediaUrls.images[message.imageFile]} 
                      alt="Generated scene" 
                      style={{ maxWidth: '100%' }} 
                    />
                  </ImageContainer>
                ) : ""
              )}
            </Message>
          ))}
          <FullscreenImageViewer 
            open={!!fullscreenImage} 
            onClose={handleCloseFullscreen} 
            imageUrl={fullscreenImage} 
          />
        </StoryContainer>

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
