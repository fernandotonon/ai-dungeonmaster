import React, { useState, useRef, useEffect } from 'react';
import { Button, CircularProgress, Box, Typography } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import api from '../services/api';

const VoiceInput = ({ onTranscript, setError, gameState }) => {
  const maxTime = 11;
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(maxTime); 
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const recordingTimeout = useRef(null);
  const countdownInterval = useRef(null);

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
      setTimeLeft(maxTime); // Reset the timer

      // Automatically stop recording after maxTime
      recordingTimeout.current = setTimeout(() => {
        stopRecording();
      }, maxTime * 1000); 

      // Countdown timer: Update every second
      countdownInterval.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(countdownInterval.current);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      setError('Failed to access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      clearTimeout(recordingTimeout.current);
      clearInterval(countdownInterval.current); // Clear the countdown
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

  useEffect(() => {
    return () => {
      // Clean up timeout and interval on component unmount
      clearTimeout(recordingTimeout.current);
      clearInterval(countdownInterval.current);
    };
  }, []);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  let buttonContent;
  if (isProcessing) {
    buttonContent = <CircularProgress size={24} />;
  } else if (isRecording) {
    buttonContent = timeLeft <= 10 ? `Stop (${timeLeft})` : 'Stop';
  } else {
    buttonContent = 'Record';
  }

  return (
    <Box display="flex" flexDirection="column" alignItems="center">

      
      <Button
        variant="contained"
        color={isRecording ? 'secondary' : 'primary'}
        startIcon={isRecording ? <StopIcon /> : <MicIcon />}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        style={{ marginBottom: '10px' }}
      >
        {buttonContent}
      </Button>
      {isRecording && (
        <Typography variant="body2" color="textSecondary">
          Time Left: {formatTime(timeLeft)}
        </Typography>
      )}
    </Box>
  );
};

export default VoiceInput;
