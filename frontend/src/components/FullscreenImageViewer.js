import React from 'react';
import { Modal, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import styled from '@emotion/styled';

const FullscreenModal = styled(Modal)`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const FullscreenImage = styled('img')`
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
`;

const CloseButton = styled(IconButton)`
  position: absolute;
  top: 20px;
  right: 20px;
  color: white;
  background-color: rgba(0, 0, 0, 0.5);
  &:hover {
    background-color: rgba(0, 0, 0, 0.7);
  }
`;

const FullscreenImageViewer = ({ open, onClose, imageUrl }) => {
  return (
    <FullscreenModal open={open} onClose={onClose}>
      <>
        <FullscreenImage src={imageUrl} alt="Fullscreen view" />
        <CloseButton onClick={onClose}>
          <CloseIcon />
        </CloseButton>
      </>
    </FullscreenModal>
  );
};

export default FullscreenImageViewer;