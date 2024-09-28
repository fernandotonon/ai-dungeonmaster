import React, { useState, useEffect } from 'react';
import { 
  TextField, 
  Button, 
  Box, 
  Typography, 
  Switch, 
  FormControlLabel, 
  Paper,
  IconButton
} from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useTheme } from '../ThemeContext';
import api from '../services/api';
import { getRandomBackground } from '../utils/backgroundUtils';
import { useKidsMode } from '../KidsModeContext';

const BackgroundContainer = styled(Box)(({ theme }) => ({
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}));

const FormContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: 400,
  width: '100%',
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)',
}));

const Form = styled('form')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

const AuthInterface = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [backgroundImage, setBackgroundImage] = useState('');
  const { darkMode, toggleTheme } = useTheme();
  const { isKidsMode } = useKidsMode();

  useEffect(() => {
    setBackgroundImage(getRandomBackground(isKidsMode));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegistering) {
        await api.auth.register(username, email, password);
        setError('Registration successful. Please log in.');
        setIsRegistering(false);
      } else {
        const response = await api.auth.login(username, password);
        onLogin(response.user);
      }
    } catch (error) {
      setError(isRegistering ? 'Registration failed' : 'Login failed');
    }
  };

  return (
    <BackgroundContainer style={{ backgroundImage: `url(${backgroundImage})` }}>
      <FormContainer elevation={3}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" gutterBottom>
            {isRegistering ? 'Register' : 'Login'}
          </Typography>
          {!isKidsMode && <IconButton onClick={toggleTheme} color="inherit">
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>}
        </div>
        <Form onSubmit={handleSubmit}>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {isRegistering && (
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
          <Button type="submit" variant="contained" color="primary">
            {isRegistering ? 'Register' : 'Login'}
          </Button>
        </Form>
        {!isKidsMode && <FormControlLabel
          control={
            <Switch
              checked={isRegistering}
              onChange={() => setIsRegistering(!isRegistering)}
              color="primary"
            />
          }
          label={isRegistering ? 'Switch to Login' : 'Switch to Register'}
        />}
        {error && (
          <Typography color="error" style={{ marginTop: '1rem' }}>
            {error}
          </Typography>
        )}
      </FormContainer>
    </BackgroundContainer>
  );
};

export default AuthInterface;