import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Button, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  IconButton,
  Typography,
  Paper,
  Box,
  Divider
} from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useTheme } from '../contexts/ThemeContext';
import { useKidsMode } from '../contexts/KidsModeContext';
import { useTranslation } from 'react-i18next'; 
import api from '../services/api';
import ActionInput from '../controls/ActionInput';
import { getRandomBackground } from '../utils/backgroundUtils';
import FullscreenImageViewer from './FullscreenImageViewer';
import MessageList from './MessageList';
import { useSocket } from '../contexts/SocketContext';
import PlayersList from './PlayerList';
import InviteDialog from './InviteDialog';

const GameInterface = ({ gameState, setGameState, onBackToGameList, setError, availableVoices, user }) => {
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
  const storyContainerRef = useRef(null);
  const socket = useSocket();
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const GameContainer = styled(Paper)(({ theme }) => ({
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

  const StoryContainer = styled(Paper)(({ theme }) => ({
    height: 'calc(100vh - 300px)',
    overflowY: 'auto',
    padding: '10px',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)',
  }));

  const scrollToBottom = () => {
    const container = storyContainerRef.current;
    
    if (container) {
      container.scrollTop = container.scrollHeight;
      sessionStorage.setItem('scrollPosition', container.scrollTop);
    }
  };
  
  useEffect(() => {
    setBackgroundImage(getRandomBackground(isKidsMode));

    const container = storyContainerRef.current;

    // Scroll to the bottom after all content is fully loaded
    const handleLoad = () => {
      requestAnimationFrame(scrollToBottom);
    };

    // Add the event listener for when all content has loaded
    window.addEventListener('load', handleLoad);

    const timer = setTimeout(scrollToBottom, 0);

    return () => {
      Object.values(mediaUrls.images).forEach(URL.revokeObjectURL);
      Object.values(mediaUrls.audios).forEach(URL.revokeObjectURL);
      container?.removeEventListener('scroll', handleLoad);
      clearTimeout(timer);
    };
  }, []);
  setTimeout(scrollToBottom, 0);
  // Add this useEffect to handle auto-scrolling
  useEffect(() => {
    const container = storyContainerRef.current;
    let scrollPosition = sessionStorage.getItem('scrollPosition') || 0;
  
    // Save scroll position before rerender
    const saveScrollPosition = () => {
      sessionStorage.setItem('scrollPosition', container.scrollTop);
      scrollPosition = container.scrollTop;
    };
  
    // Restore scroll position after rerender
    const restoreScrollPosition = () => {
      container.scrollTop = scrollPosition;
    };
  
    // Set up listeners for saving/restoring scroll position
    container.addEventListener('scroll', saveScrollPosition);
    const timer = setTimeout(restoreScrollPosition, 0);
    return () => {
      container?.removeEventListener('scroll', saveScrollPosition);
      clearTimeout(timer);
    };
  }, [gameState.storyMessages]);

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

  const handleLeaveGame = async () => {
    try {
      await api.game.leaveGame(gameState._id);
      socket.emit('leaveGame', gameState._id);
      onBackToGameList();
    } catch (error) {
      console.error('Error leaving game:', error);
      setError('Failed to leave game');
    }
  };

  useEffect(() => {
    if (socket && gameState._id) {
      socket.emit('joinGame', gameState._id);

      socket.on('gameUpdate', (updatedGameState) => {
        setGameState(updatedGameState);
      });

      return () => {
        socket.emit('leaveGame', gameState._id);
        socket.off('gameUpdate');
      };
    }
  }, [socket, gameState._id]);

  const handleInvitePlayer = async (inviteData) => {
    try {
      const response = await api.game.addPlayer(gameState._id, inviteData.username, inviteData.role);
      setGameState(response.data.gameState);
      setShowInviteDialog(false);
    } catch (error) {
      console.error('Error inviting player:', error);
      setError('Failed to invite player');
    }
  };

  scrollToBottom();
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
        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} >
          <Box sx={{ minWidth: '150px', marginRight: 1 }}>
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


            <Box sx={{ marginBottom: 2, marginTop: 2, width: '100%' }}>
              <Typography variant="h6">{t('players')}</Typography>
              <Divider sx={{ my: 1, width: '100%' }} />
              <PlayersList
                players={gameState.players}
                currentUser={user}
                onLeaveGame={() => handleLeaveGame(gameState._id)}
              />
              {gameState.players.find(p => p.userId === user.userId)?.isHost && (
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => setShowInviteDialog(true)}
                  sx={{ mt: 1 }}
                >
                  {t('invite_players')}
                </Button>
              )}
            </Box>
          </Box>
          <Box display="flex" flexDirection="column" sx={{ width: '100%' }}>
            <StoryContainer elevation={2} ref={storyContainerRef}>
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
      <InviteDialog
        open={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        onInvite={handleInvitePlayer}
        gameId={gameState._id}
      />
    </GameContainer>
  );
};

export default GameInterface;
