import React, { useState, useRef, useEffect } from 'react';
import { Button, CircularProgress, Box, Typography } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import { useTranslation } from 'react-i18next'; // Import the translation hook
import api from '../services/api';

const VoiceInput = ({ onTranscript, setError, gameState }) => {
  const { t } = useTranslation(); // Initialize the translation hook
  const maxTime = 60;
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
      setError(t('error_access_microphone')); 
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
      // Convert WebM to WAV and ensure the correct sample rate (16000 Hz)
      const wavBlob = await convertWebMToWav(audioBlob, 16000);
  
      // Send the resampled WAV blob to your API for transcription
      const response = await api.ai.speechToText(gameState._id, wavBlob);
      const transcript = response.data.transcript;
      onTranscript(transcript);
    } catch (error) {
      console.error('Error in speech to text conversion:', error);
      setError(t('error_speech_to_text')); 
    } finally {
      setIsProcessing(false);
    }
  };
  
  const convertWebMToWav = async (audioBlob, targetSampleRate = 16000) => {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
    // Resample the audio to the target sample rate (16000 Hz)
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      Math.floor(audioBuffer.length * (targetSampleRate / audioBuffer.sampleRate)),
      targetSampleRate
    );
  
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);
  
    const resampledBuffer = await offlineContext.startRendering();
  
    // Convert the resampled audio buffer to a WAV Blob
    const wavBlob = audioBufferToWavBlob(resampledBuffer, targetSampleRate);
    return wavBlob;
  };
  
  // Updated helper function to convert AudioBuffer to WAV Blob with target sample rate
  const audioBufferToWavBlob = (audioBuffer, sampleRate = 16000) => {
    const wavArrayBuffer = audioBufferToWav(audioBuffer, sampleRate);
    return new Blob([wavArrayBuffer], { type: 'audio/wav' });
  };
  
  // Updated function to convert an AudioBuffer to WAV with the correct sample rate
  const audioBufferToWav = (audioBuffer, sampleRate = 16000) => {
    const numOfChan = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let sample;
    let offset = 0;
    let pos = 0;
  
    // Write WAV header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
  
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(sampleRate);
    setUint32(sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit (hardcoded in this demo)
  
    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length
  
    // Write interleaved data
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }
  
    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
        sample = (0.5 + sample * 32767) | 0; // scale to 16-bit signed int
        view.setInt16(pos, sample, true); // write 16-bit sample
        pos += 2;
      }
      offset++; // next source sample
    }
  
    function setUint16(data) {
      view.setUint16(pos, data, true);
      pos += 2;
    }
  
    function setUint32(data) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
  
    return buffer;
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
    buttonContent = timeLeft <= 10 ? `${t('stop')} (${timeLeft})` : t('stop'); 
  } else {
    buttonContent = t('record'); 
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
          {t('time_left')}: {formatTime(timeLeft)} 
        </Typography>
      )}
    </Box>
  );
};

export default VoiceInput;
