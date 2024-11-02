import React from 'react';
import { List, ListItem, ListItemText, ListItemAvatar, Avatar, IconButton, Typography } from '@mui/material';
import { Person, Star, ExitToApp } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const PlayersList = ({ players, currentUser, onLeaveGame, onRemovePlayer }) => {
  const { t } = useTranslation();

  const isHost = players.find(p => p.userId === currentUser.userId)?.isHost;
  return (
    <List>
      {players.map((player) => (
        <ListItem
          key={player.userId}
          secondaryAction={
            (currentUser.userId === player.userId || isHost) && (
              <IconButton edge="end" onClick={currentUser.userId === player.userId ? onLeaveGame : () => onRemovePlayer(player.userId)}>
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
            secondary={t(`${player.role.toLowerCase()}`)}
          />
        </ListItem>
      ))}
    </List>
  );
};

export default PlayersList;