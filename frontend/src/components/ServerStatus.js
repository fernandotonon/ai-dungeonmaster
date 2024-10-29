import React from 'react';
import { Alert, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

const ServerStatus = ({ isServerDown }) => {
  const { t } = useTranslation();

  if (!isServerDown) return null;

  return (
    <Box sx={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, width: '80%', maxWidth: 500 }}>
      <Alert severity="error" variant="filled">
        {t('server_down_message')}
      </Alert>
    </Box>
  );
};

export default ServerStatus;