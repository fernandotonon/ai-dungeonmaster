import React, { useMemo } from 'react';
import MessageItem from './MessageItem';

const MessageList = ({ 
  gameState, 
  mediaUrls, 
  loadingFiles, 
  handleSubmitAction, 
  handleGenerateAudio, 
  handleGenerateImage, 
  handleImageClick,
  isGeneratingAudio,
  isGeneratingImage
}) => {
  const memoizedMessages = useMemo(() => {
    return gameState.storyMessages.slice().reverse().map((message, index) => (
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
      />
    ));
  }, [gameState, mediaUrls, loadingFiles, handleSubmitAction, handleGenerateAudio, handleGenerateImage, handleImageClick]);

  return <>{memoizedMessages}</>;
};

export default MessageList;