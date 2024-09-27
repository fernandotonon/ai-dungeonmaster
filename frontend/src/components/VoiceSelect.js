import React, { useState, useEffect } from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { ai } from '../services/api';

const VoiceSelect = ({ value, onChange }) => {
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await ai.getAvailableVoices();
        setVoices(response.data.voices);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch voices:', error);
        setLoading(false);
      }
    };

    fetchVoices();
  }, []);

  if (loading) {
    return <div>Loading voices...</div>;
  }

  return (
    <FormControl fullWidth>
      <InputLabel id="voice-select-label">Voice</InputLabel>
      <Select
        labelId="voice-select-label"
        value={voices.includes(value) ? value : ''}
        onChange={onChange}
        label="Voice"
      >
        {voices.map((voice) => (
          <MenuItem key={voice} value={voice}>
            {voice}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default VoiceSelect;