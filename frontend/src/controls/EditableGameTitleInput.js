import React, { useState, useRef, useEffect } from 'react';
import { ListItemText, TextField, IconButton, Box, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import { Edit, Save, Cancel, Delete } from '@mui/icons-material';

const EditableGameTitle = ({ game, onSave, onLoadGame, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(game.title);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
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

  const handleDeleteClick = () => {
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    onDelete(game._id);
    setOpenDeleteDialog(false);
  };

  const handleDeleteCancel = () => {
    setOpenDeleteDialog(false);
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
      <IconButton onClick={handleDeleteClick}>
        <Delete />
      </IconButton>
      <Dialog
        open={openDeleteDialog}
        onClose={handleDeleteCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Delete Game"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this game? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EditableGameTitle;