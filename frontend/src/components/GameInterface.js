import React, { useState } from 'react';
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
  Grid
} from '@mui/material';
import { VolumeUp, Image } from '@mui/icons-material';
import styled from 'styled-components';
import api from '../services/api';
import VoiceInput from './VoiceInput';

const GameContainer = styled(Paper)`
  padding: 20px;
  margin-top: 20px;
`;

const StoryContainer = styled(Paper)`
  max-height: 400px;
  overflow-y: auto;
  padding: 10px;
  margin-top: 20px;
`;

const Message = styled.div`
  margin-bottom: 10px;
  padding: 10px;
  border-radius: 4px;
  background-color: ${props => props.sender === props.aiRole ? '#e3f2fd' : '#e8f5e9'};
`;

const ImageContainer = styled.div`
  max-width: 100%;
  margin-top: 10px;
`;

const ActionContainer = styled.div`
  margin-top: 20px;
`;

const GameInterface = ({ gameState, setGameState, onBackToGameList, setError }) => {
  const [action, setAction] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

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
      const response = await api.ai.submitStory(gameState._id, text, gameState.playerRole);
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
      const response = await api.ai.generateImage(gameState._id, messageIndex, gameState.imageStyle);
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

  const voices = ['Alloy', 'Echo', 'Fable', 'Onyx', 'Nova', 'Shimmer'];

  return (
    <GameContainer elevation={3}>
      <Typography variant="h4" gutterBottom>
        {gameState.title || 'Untitled Story'}
      </Typography>
      
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
              {voices.map(voice => (
                <MenuItem key={voice} value={voice.toLowerCase()}>{voice}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <Typography variant="body1" gutterBottom>
        Your Role: {gameState.playerRole}
      </Typography>
      <Typography variant="body1" gutterBottom>
        AI Role: {gameState.aiRole}
      </Typography>
      <Typography variant="body1" gutterBottom>
        AI Model: {gameState.aiModel}
      </Typography>
      <Typography variant="body1" gutterBottom>
        Players: {gameState.players.join(', ')}
      </Typography>

      {gameState.playerRole === 'DM' && (
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
        <Button onClick={() => handleSubmitAction(action)} variant="contained" color="primary">
          Submit Action
        </Button>
        <VoiceInput 
          onTranscript={handleSubmitAction} 
          setError={setError} 
        />
      </div>
      </ActionContainer>

      <StoryContainer elevation={2}>
        {gameState.storyMessages.map((message, index) => (
          <Message key={message.id} sender={message.sender} aiRole={gameState.aiRole}>
            <Typography variant="subtitle1">
              <strong>{message.sender}:</strong> {message.content}
            </Typography>
            <IconButton 
              onClick={() => handleGenerateAudio(index)}
              disabled={isGeneratingAudio}
            >
              <VolumeUp />
            </IconButton>
            <IconButton 
              onClick={() => handleGenerateImage(index)}
              disabled={isGeneratingImage}
            >
              <Image />
            </IconButton>
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
    </GameContainer>
  );
};

export default GameInterface;