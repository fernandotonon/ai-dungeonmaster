import React from 'react';
import { List, ListItem, ListItemText, ListItemAvatar, Avatar, IconButton, Typography } from '@mui/material';
import { Person, Star, ExitToApp } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const PlayersList = ({ players, currentUser, onLeaveGame }) => {
  const { t } = useTranslation();

  return (
    <List>
      {players.map((player) => (
        <ListItem
          key={player.userId}
          secondaryAction={
            currentUser._id === player.userId && (
              <IconButton edge="end" onClick={onLeaveGame}>
                <ExitToApp />
              </IconButton>
            )
          }
        >
          <ListItemAvatar>
            <Avatar>
              <Person />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Typography>
                {player.username}
                {player.isHost && (
                  <Star fontSize="small" color="primary" style={{ marginLeft: 8 }} />
                )}
              </Typography>
            }
            secondary={player.role}
          />
        </ListItem>
      ))}
    </List>
  );
};

export default PlayersList;