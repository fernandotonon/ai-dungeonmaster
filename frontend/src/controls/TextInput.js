import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { TextField } from '@mui/material';

const TextInput = forwardRef(({ label, initialValue = '', onChange }, ref) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getValue: () => value,
    setValue: (newValue) => setValue(newValue),
    focus: () => inputRef.current.focus(),
  }));

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <TextField
      label={label}
      value={value}
      onChange={handleChange}
      fullWidth
      inputRef={inputRef}
    />
  );
});

export default TextInput;