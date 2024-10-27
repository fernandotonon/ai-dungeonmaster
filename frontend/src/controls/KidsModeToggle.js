import React from 'react';
import { Switch, FormControlLabel } from '@mui/material';
import { useKidsMode } from '../contexts/KidsModeContext';

const KidsModeToggle = () => {
  const { isKidsMode, toggleKidsMode } = useKidsMode();

  return (
    <FormControlLabel
      control={
        <Switch
          checked={isKidsMode}
          onChange={toggleKidsMode}
          color="primary"
        />
      }
      label="Kids Mode"
    />
  );
};

export default KidsModeToggle;