import React, { useState, useRef, useEffect } from 'react';
import { ListItemText, TextField, IconButton, Box } from '@mui/material';
import { Edit, Save, Cancel } from '@mui/icons-material';

const EditableGameTitle = ({ game, onSave, onLoadGame }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(game.title);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveClick = () => {
    onSave({...game, title: editTitle});
    setIsEditing(false);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setEditTitle(game.title);
  };

  const handleChange = (e) => {
    setEditTitle(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSaveClick();
    }
  };

  if (isEditing) {
    return (
      <Box display="flex" alignItems="center" width="100%">
        <TextField
          value={editTitle}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          fullWidth
          variant="standard"
          inputRef={inputRef}
        />
        <IconButton onClick={handleSaveClick}>
          <Save />
        </IconButton>
        <IconButton onClick={handleCancelClick}>
          <Cancel />
        </IconButton>
      </Box>
    );
  }

  return (
    <>
      <ListItemText 
        primary={game.title} 
        secondary={new Date(game.updatedAt).toLocaleString()} 
        onClick={() => onLoadGame(game._id)}
        sx={{ cursor: 'pointer' }}
      />
      <IconButton onClick={handleEditClick}>
        <Edit />
      </IconButton>
    </>
  );
};

export default EditableGameTitle;