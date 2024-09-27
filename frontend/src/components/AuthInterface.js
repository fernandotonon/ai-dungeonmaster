import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, Switch, FormControlLabel, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import api from '../services/api';

const BackgroundContainer = styled(Box)(({ theme }) => ({
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  transition: 'background-image 0.5s ease-in-out',
}));

const FormContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: 400,
  width: '100%',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
}));

const Form = styled('form')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

const backgroundImages = [
  '/background-images/greek.webp',
  '/background-images/japan.webp',
  '/background-images/magical.webp',
  '/background-images/mistery-forest.webp',
  '/background-images/oldwest.webp',
  '/background-images/pirate.webp',
  '/background-images/space.webp',
  '/background-images/steampunk.webp',
  '/background-images/underwater.webp',
];

const AuthInterface = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [backgroundImage, setBackgroundImage] = useState('');

  useEffect(() => {
    const randomImage = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
    setBackgroundImage(randomImage);
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
        <Typography variant="h5" gutterBottom>
          {isRegistering ? 'Register' : 'Login'}
        </Typography>
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
        <FormControlLabel
          control={
            <Switch
              checked={isRegistering}
              onChange={() => setIsRegistering(!isRegistering)}
              color="primary"
            />
          }
          label={isRegistering ? 'Switch to Login' : 'Switch to Register'}
        />
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