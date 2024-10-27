import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const InviteDialog = ({ open, onClose, onInvite, gameId }) => {
  const { t } = useTranslation();
  const [inviteData, setInviteData] = useState({
    username: '',
    role: 'Player'
  });

  const handleInvite = () => {
    onInvite(inviteData);
    setInviteData({ username: '', role: 'Player' });
  };

  const inviteLink = `${window.location.origin}/join/${gameId}`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('invite_players')}</DialogTitle>
      <DialogContent>
        <Box sx={{ my: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('share_link')}:
          </Typography>
          <TextField
            fullWidth
            value={inviteLink}
            variant="outlined"
            size="small"
            InputProps={{
              readOnly: true,
            }}
          />
        </Box>
        <Box sx={{ my: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('or_invite_directly')}:
          </Typography>
          <TextField
            fullWidth
            label={t('username')}
            value={inviteData.username}
            onChange={(e) => setInviteData({ ...inviteData, username: e.target.value })}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>{t('role')}</InputLabel>
            <Select
              value={inviteData.role}
              onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
            >
              <MenuItem value="Player">{t('player')}</MenuItem>
              <MenuItem value="Observer">{t('observer')}</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          {t('cancel')}
        </Button>
        <Button 
          onClick={handleInvite} 
          color="primary" 
          variant="contained"
          disabled={!inviteData.username}
        >
          {t('invite')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InviteDialog;