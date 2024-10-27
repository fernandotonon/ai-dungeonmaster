import React, { createContext, useState, useContext, useEffect } from 'react';

const KidsModeContext = createContext();

export const useKidsMode = () => useContext(KidsModeContext);

export const KidsModeProvider = ({ children }) => {
  const [isKidsMode, setIsKidsMode] = useState(false);

  useEffect(() => {
    const savedMode = localStorage.getItem('kidsMode');
    if (savedMode) {
      setIsKidsMode(savedMode === 'true');
    }
  }, []);

  const toggleKidsMode = () => {
    setIsKidsMode(!isKidsMode);
    localStorage.setItem('kidsMode', (!isKidsMode).toString());
  };

  return (
    <KidsModeContext.Provider value={{ isKidsMode, toggleKidsMode }}>
      {children}
    </KidsModeContext.Provider>
  );
};