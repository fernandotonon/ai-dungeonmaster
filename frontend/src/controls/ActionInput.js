import React, { useState, useRef } from 'react';
import { TextField, Button, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import VoiceInput from './VoiceInput';

const ActionContainer = styled(Box)(({ theme }) => ({
  marginTop: '20px',
}));

const ActionInput = ({ onSubmit, setError, gameState }) => {
  const [action, setAction] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = () => {
    onSubmit(action);
    setAction('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <ActionContainer>
      <TextField
        label="Enter your action or narrative"
        multiline
        rows={4}
        value={action}
        onChange={(e) => setAction(e.target.value)}
        fullWidth
        inputRef={inputRef}
      />
      <Box display="flex" justifyContent="space-between" marginTop="10px">
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
        >
          Submit Action
        </Button>
        <VoiceInput 
          onTranscript={(text) => {
            setAction(text);
            onSubmit(text);
          }}
          setError={setError}
          gameState={gameState}
        />
      </Box>
    </ActionContainer>
  );
};

export default ActionInput;