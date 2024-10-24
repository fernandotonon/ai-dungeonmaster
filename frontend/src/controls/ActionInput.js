import React, { useState, useRef } from 'react';
import { TextField, Button, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useTranslation } from 'react-i18next'; 
import VoiceInput from './VoiceInput';

const ActionContainer = styled(Box)(({ theme }) => ({
  marginTop: '20px',
}));

const ActionInput = ({ onSubmit, setError, gameState }) => {
  const { t } = useTranslation(); 
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
      <Box display="flex">
        <TextField
          label={t('enter_action')} 
          multiline
          minRows={1}
          maxRows={10}
          value={action}
          onChange={(e) => setAction(e.target.value)}
          fullWidth
          inputRef={inputRef}
        />
        {inputRef?.current?.value?.length > 0 && (
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
          >
            {t('submit_action')} 
          </Button>
        )}
        {!inputRef?.current?.value?.length && (
          <VoiceInput 
            onTranscript={(text) => {
              onSubmit(text);
            }}
            setError={setError}
            gameState={gameState}
          />
        )}
      </Box>
    </ActionContainer>
  );
};

export default ActionInput;
