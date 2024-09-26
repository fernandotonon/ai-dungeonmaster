import React, { useState } from 'react';
import { TextField, Button, Box, Typography, Switch, FormControlLabel } from '@mui/material';
import { styled } from '@mui/material/styles';
import api from '../services/api';

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
        localStorage.setItem('token', response.data.token);
        onLogin(response.data.userId, username);
      }
    } catch (error) {
      setError(isRegistering ? 'Registration failed' : 'Login failed');
    }
  };

  return (
    <Box>
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
    </Box>
  );
};

export default AuthInterface;