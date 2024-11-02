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

  return <>{memoizedMessages}</>;
};

export default MessageList;