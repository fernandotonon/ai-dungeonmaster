import React, { useState, useCallback, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { Typography, Box, IconButton, CircularProgress, Button } from '@mui/material';
import { VolumeUp, Image } from '@mui/icons-material';
import api from '../services/api';

const MessageItem = ({ index, messageIndex, message, onGenerateAudio, onGenerateImage, handleImageClick, aiRole, handleSubmitAction, mediaUrls, loadingFiles }) => {
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const handleGenerateAudio = useCallback(async () => {
    setIsGeneratingAudio(true);
    await onGenerateAudio(messageIndex);
    setIsGeneratingAudio(false);
  }, [onGenerateAudio, messageIndex]);

  const handleGenerateImage = useCallback(async () => {
    setIsGeneratingImage(true);
    await onGenerateImage(messageIndex);
    setIsGeneratingImage(false);
  }, [onGenerateImage, messageIndex]);

  const Message = styled(Box)(({ theme, sender, aiRole }) => ({
    marginBottom: '10px',
    padding: '10px',
    borderRadius: '4px',
    backgroundColor: sender === aiRole 
      ? theme.palette.mode === 'dark' ? 'rgba(0, 0, 255, 0.2)' : 'rgba(0, 0, 255, 0.1)'
      : theme.palette.mode === 'dark' ? 'rgba(0, 255, 0, 0.2)' : 'rgba(0, 255, 0, 0.1)',
  }));

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

  return (
    <Message sender={message.sender} aiRole={aiRole}>
      {(index === 0) && getMessageOptions(message.content).map((option, index) => (
        <Button key={index} onClick={() => handleSubmitAction(option)}>
            {option}
        </Button>
      ))}
      <Typography variant="subtitle1">
        <strong>{message.sender}:</strong> {getMessageContent(message.content)}
      </Typography>
      <Box display="flex" alignItems="center">
      </Box>
      <Box display="flex" alignItems="center">
        {message.audioFile && (
          loadingFiles.has(message.audioFile) ? (
            <CircularProgress size={24} />
          ) : mediaUrls.audios[message.audioFile] ? (
            <audio controls src={mediaUrls.audios[message.audioFile]} />
          ) : null
        )}
        {!message.audioFile && (
          <IconButton 
            onClick={handleGenerateAudio}
            disabled={isGeneratingAudio}
          >
            <VolumeUp />
          </IconButton>
        )}
        {!message.imageFile && (
          <IconButton 
            onClick={handleGenerateImage}
            disabled={isGeneratingImage}
            style={{ marginLeft: '15px' }}
          >
            <Image />
          </IconButton>
        )}
      </Box>
      {message.imageFile && (
        loadingFiles.has(message.imageFile) ? (
          <CircularProgress size={24} />
        ) : mediaUrls.images[message.imageFile] ? (
          <Box onClick={() => handleImageClick(mediaUrls.images[message.imageFile])} style={{ cursor: 'pointer' }}>
            <img 
              src={mediaUrls.images[message.imageFile]} 
              alt="Generated scene" 
              style={{ maxWidth: '100%' }} 
            />
          </Box>
        ) : null
      )}
    </Message>
  );
};

export default React.memo(MessageItem);