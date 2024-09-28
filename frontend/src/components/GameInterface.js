import React, { useState, useEffect } from 'react';
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
  Grid,
  Box
} from '@mui/material';
import { VolumeUp, Image, Brightness4, Brightness7 } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useTheme } from '../ThemeContext';
import { useKidsMode } from '../KidsModeContext';
import api from '../services/api';
import VoiceInput from '../controls/VoiceInput';
import { getRandomBackground } from '../utils/backgroundUtils';

const GameInterface = ({ gameState, setGameState, onBackToGameList, setError }) => {
  const [backgroundImage, setBackgroundImage] = useState('');
  const [action, setAction] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const { darkMode, toggleTheme } = useTheme();
  const { isKidsMode } = useKidsMode();

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

  const ImageContainer = styled(Box)({
    maxWidth: '100%',
    marginTop: '10px',
  });

  const ActionContainer = styled(Box)({
    marginTop: '20px',
  });

  useEffect(() => {
    setBackgroundImage(getRandomBackground(isKidsMode));
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
      const response = await api.ai.submitStory(gameState._id, text, gameState.playerRole, isKidsMode);
      setGameState(response.data.gameState);
      setAction('');
    } catch (error) {
      console.error('Error submitting action:', error);
      setError('Failed to submit action. Please try again.');
    }
  };

  const handleGenerateImage = async (messageIndex) => {
    if (isGeneratingImage) return;
    setIsGeneratingImage(true);
    try {
      const response = await api.ai.generateImage(gameState._id, messageIndex, gameState.imageStyle, isKidsMode);
      const updatedGameState = { ...gameState };
      updatedGameState.storyMessages[messageIndex].imageFile = response.data.imageUrl;
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
      const response = await api.ai.generateAudio(gameState._id, messageIndex, gameState.voice);
      const audioFile = response.data.audioFile;
      const audio = new Audio(api.ai.getAudioFile(audioFile));
      audio.play();
      
      const updatedGameState = { ...gameState };
      updatedGameState.storyMessages[messageIndex].audioFile = audioFile;
      setGameState(updatedGameState);
    } catch (error) {
      console.error('Error generating audio:', error);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  return (
    <GameContainer elevation={3}>
      <ContentContainer>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" gutterBottom>
            {gameState.title || 'Untitled Story'}
          </Typography>
          {!isKidsMode && <IconButton onClick={toggleTheme} color="inherit">
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>}
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Image Style</InputLabel>
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
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Voice</InputLabel>
              <Select
                value={gameState.voice}
                onChange={(e) => handleUpdatePreferences(gameState.imageStyle, e.target.value)}
              >
                {['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].map(voice => (
                  <MenuItem key={voice} value={voice.toLowerCase()}>{voice}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box display="flex" justifyContent="space-around" alignItems="center" marginTop="10px">
          <Typography variant="body1" gutterBottom>
            Your Role: {gameState.playerRole}
          </Typography>
          <Typography variant="body1" gutterBottom>
            AI Role: {gameState.aiRole}
          </Typography>
        </Box>
        {!isKidsMode && 
          <Typography variant="body1" gutterBottom>
            AI Model: {gameState.aiModel}
          </Typography>
        }
        {!isKidsMode && 
          <Typography variant="body1" gutterBottom>
            Players: {gameState.players.join(', ')}
          </Typography>
        }

        {!isKidsMode && gameState.playerRole === 'DM' && (
          <Grid container spacing={2} style={{ marginTop: '20px' }}>
            <Grid item xs={12} sm={8}>
              <TextField
                label="Player Name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button 
                onClick={handleAddPlayer} 
                variant="contained" 
                color="secondary"
                fullWidth
              >
                Add Player
              </Button>
            </Grid>
          </Grid>
        )}

        <ActionContainer>
          <TextField
            label="Enter your action or narrative"
            multiline
            rows={4}
            value={action}
            onChange={(e) => setAction(e.target.value)}
            fullWidth
          />
          <Box display="flex" justifyContent="space-between" marginTop="10px">
            <Button onClick={() => handleSubmitAction(action)} variant="contained" color="primary">
              Submit Action
            </Button>
            <VoiceInput 
              onTranscript={handleSubmitAction} 
              setError={setError} 
              gameState={gameState}
            />
          </Box>
        </ActionContainer>

        <StoryContainer elevation={2}>
          {gameState.storyMessages.slice().reverse().map((message, index) => (
            <Message key={message.id} sender={message.sender} aiRole={gameState.aiRole}>
              <Typography variant="subtitle1">
                <strong>{message.sender}:</strong> {message.content}
              </Typography>
              <IconButton 
                onClick={() => handleGenerateAudio(gameState.storyMessages.length - index - 1)}
                disabled={isGeneratingAudio}
              >
                <VolumeUp />
              </IconButton>
              {!message.imageFile && (
                <IconButton 
                  onClick={() => handleGenerateImage(gameState.storyMessages.length - index - 1)}
                  disabled={isGeneratingImage}
                >
                  <Image />
                </IconButton>
              )}
              {message.imageFile && (
                <ImageContainer>
                  <img 
                    src={api.ai.getImageFile(message.imageFile)} 
                    alt="Generated scene" 
                    style={{ maxWidth: '100%' }} 
                  />
                </ImageContainer>
              )}
            </Message>
          ))}
        </StoryContainer>

        <Button 
          onClick={onBackToGameList} 
          variant="contained" 
          color="secondary"
          style={{ marginTop: '20px' }}
        >
          Back to Game List
        </Button>
      </ContentContainer>
    </GameContainer>
  );
};

export default GameInterface;