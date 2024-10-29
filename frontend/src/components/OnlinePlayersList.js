import React from 'react';
import { Paper, Typography, List, ListItem, ListItemText, ListItemIcon } from '@mui/material';
import { PersonOutline } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const OnlinePlayersList = ({ onlineUsers }) => {
    const { t } = useTranslation();

    return (
      <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6">{t('online_players')} ({onlineUsers.length})</Typography>
        <List dense>
          {onlineUsers.map((user) => (
            <ListItem key={user.userId}>
              <ListItemIcon>
                <PersonOutline />
              </ListItemIcon>
              <ListItemText primary={user.username} />
            </ListItem>
          ))}
        </List>
      </Paper>
    );
  };

export default OnlinePlayersList;