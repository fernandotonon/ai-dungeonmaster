import React, { useState, useEffect } from 'react';
import { Button, Select, MenuItem, FormControl, InputLabel, List, ListItem, ListItemText } from '@mui/material';
import styled from 'styled-components';
import api from '../services/api';

const UserInterfaceContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const GamesList = styled(List)`
  max-height: 200px;
  overflow-y: auto;
`;

const UserInterface = ({ user, onLogout, userGames, onLoadGame, onInitGame }) => {
  const [selectedModel, setSelectedModel] = useState('gpt4o-mini');
  const [imageStyle, setImageStyle] = useState('fantasy illustration');
  const [selectedVoice, setSelectedVoice] = useState('onyx');
  const [aiModels, setAiModels] = useState([]);
  const [availableVoices, setAvailableVoices] = useState([]);

  useEffect(() => {
    fetchAiModels();
    fetchAvailableVoices();
  }, []);

  const fetchAiModels = async () => {
    try {
      const response = await api.ai.getAIModels();
      setAiModels(response.data.models);
    } catch (error) {
      console.error('Error fetching AI models:', error);
    }
  };

  const fetchAvailableVoices = async () => {
    try {
      const response = await api.ai.getAvailableVoices();
      setAvailableVoices(response.data.voices);
    } catch (error) {
      console.error('Error fetching available voices:', error);
    }
  };

  return (
    <UserInterfaceContainer>
      <h2>Welcome, {user.username}!</h2>
      <Button onClick={onLogout} variant="contained" color="secondary">
        Logout
      </Button>

      <h3>Your Games:</h3>
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

      <h3>Start a new game:</h3>
      <FormControl fullWidth>
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

      <FormControl fullWidth>
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

      <FormControl fullWidth>
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
      >
        New Game as Dungeon Master
      </Button>
      <Button 
        onClick={() => onInitGame('Player', selectedModel, imageStyle, selectedVoice)} 
        variant="contained" 
        color="primary"
      >
        New Game as Player
      </Button>
    </UserInterfaceContainer>
  );
};

export default UserInterface;