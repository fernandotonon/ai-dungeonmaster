import React, { memo } from 'react';
import { Typography, Box, IconButton, CircularProgress, Button } from '@mui/material';
import { VolumeUp, Image } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { getMessageContent, getMessageOptions } from '../utils/messageUtils';

const MessageItem = ({ message, index, gameState, mediaUrls, loadingFiles, handleSubmitAction, handleGenerateAudio, handleGenerateImage, handleImageClick }) => {
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

  const ButtonContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
  }));

  const messageOptions = getMessageOptions(message.content);

  return (
    <Message sender={message.sender} aiRole={gameState.aiRole}>
      {messageOptions && index === 0 && (
        <ButtonContainer>
          {messageOptions.map((option, index) => (
            <Button key={index} onClick={() => handleSubmitAction(option)}>
              {option}
            </Button>
          ))}
        </ButtonContainer>
      )}
      <Typography variant="subtitle1">
        <strong>{message.sender}:</strong> {getMessageContent(message.content)}
      </Typography>
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
            onClick={() => handleGenerateAudio(gameState.storyMessages.length - index - 1)}
            disabled={loadingFiles.has(message.audioFile)}
          >
            <VolumeUp />
          </IconButton>
        )}
        {!message.imageFile && (
          <IconButton 
            onClick={() => handleGenerateImage(gameState.storyMessages.length - index - 1)}
            disabled={loadingFiles.has(message.imageFile)}
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
          <ImageContainer onClick={() => handleImageClick(mediaUrls.images[message.imageFile])}>
            <img 
              src={mediaUrls.images[message.imageFile]} 
              alt="Generated scene" 
              style={{ maxWidth: '100%' }} 
            />
          </ImageContainer>
        ) : null
      )}
    </Message>
  );
};

export default memo(MessageItem);