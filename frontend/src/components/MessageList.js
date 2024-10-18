import React, { useMemo } from 'react';
import MessageItem from './MessageItem';

const MessageList = ({ gameState, mediaUrls, loadingFiles, handleSubmitAction, handleGenerateAudio, handleGenerateImage, handleImageClick }) => {
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
      />
    ));
  }, [gameState, mediaUrls, loadingFiles, handleSubmitAction, handleGenerateAudio, handleGenerateImage, handleImageClick]);

  return <>{memoizedMessages}</>;
};

export default MessageList;