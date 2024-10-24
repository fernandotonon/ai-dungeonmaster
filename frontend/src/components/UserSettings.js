import React, { useState } from 'react';
import { Button, TextField, Typography, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useTranslation } from 'react-i18next';

const UserSettings = ({ user, onUpdateUser }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState(user.language || 'en');

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Handle user settings update logic here
    // For example, call an API to update the user settings
    await onUpdateUser({ email, password, language });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Typography variant="h5" gutterBottom>
        {t('userSettings')}
      </Typography>
      <TextField
        label={t('email')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label={t('password')}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        fullWidth
        margin="normal"
      />
      <FormControl fullWidth margin="normal">
        <InputLabel>{t('language')}</InputLabel>
        <Select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {['en', 'pt-br', 'es', 'de', 'it', 'fr'].map(lang => (
            <MenuItem key={lang} value={lang}>
              {lang.toUpperCase()}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button type="submit" variant="contained" color="primary">
        {t('saveChanges')}
      </Button>
    </Box>
  );
};

export default UserSettings;