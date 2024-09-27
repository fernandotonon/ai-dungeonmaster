import React, { useState, useRef } from 'react';
import { Button, CircularProgress } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import api from '../services/api';

const VoiceInput = ({ onTranscript, setError, gameState }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = handleStop;
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setError('Failed to access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const handleStop = async () => {
    setIsProcessing(true);
    const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
    try {
      const response = await api.ai.speechToText(gameState._id, audioBlob);
      const transcript = response.data.transcript;
      onTranscript(transcript);
    } catch (error) {
      console.error('Error in speech to text conversion:', error);
      setError('Failed to convert speech to text. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      variant="contained"
      color={isRecording ? 'secondary' : 'primary'}
      startIcon={isRecording ? <StopIcon /> : <MicIcon />}
      onClick={isRecording ? stopRecording : startRecording}
      disabled={isProcessing}
    >
      {isProcessing ? <CircularProgress size={24} /> : (isRecording ? 'Stop' : 'Record')}
    </Button>
  );
};

export default VoiceInput;