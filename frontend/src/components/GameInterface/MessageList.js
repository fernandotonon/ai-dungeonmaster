import React, { useMemo } from 'react';
import MessageItem from './MessageItem';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

const MessageList = ({ 
  gameState, 
  mediaUrls, 
  loadingFiles, 
  handleSubmitAction, 
  handleGenerateAudio, 
  handleGenerateImage, 
  handleImageClick,
  isGeneratingAudio,
  isGeneratingImage,
  isAiProcessing
}) => {
  const { t } = useTranslation();

  const memoizedMessages = useMemo(() => {
    return gameState.storyMessages.slice().map((message, index) => (
      <MessageItem
        key={message.id}
        message={message}
        index={index}
        gameState={gameState}
        mediaUrls={mediaUrls}
        loadingFiles={loadingFiles}
        handleGenerateAudio={handleGenerateAudio}
        handleGenerateImage={handleGenerateImage}
        handleImageClick={handleImageClick}
        handleSubmitAction={handleSubmitAction}
        isGeneratingAudio={isGeneratingAudio}
        isGeneratingImage={isGeneratingImage}
        showOptions={index === gameState.storyMessages.length - 1}
      />
    ));
  }, [gameState, mediaUrls, loadingFiles, handleSubmitAction, handleGenerateAudio, handleGenerateImage, handleImageClick]);

  return (
    <>
      {memoizedMessages}
      {isAiProcessing && (
        <Box display="flex" alignItems="center" justifyContent="center" gap={2} p={2}>
          <CircularProgress size={24} />
          <Typography variant="body2" color="textSecondary">
            {t('ai_thinking')}
          </Typography>
        </Box>
      )}
    </>
  );
};

export default MessageList;