import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [story, setStory] = useState('');
  const [userInput, setUserInput] = useState('');

  const generateStory = async () => {
    try {
      const response = await axios.post('http://localhost:3000/story', {
        prompt: userInput
      });
      setStory(response.data.generated_text);
    } catch (error) {
      console.error('Error generating story:', error);
    }
  };

  return (
    <div className="App">
      <h1>AI DungeonMaster</h1>
      <textarea
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder="Enter your prompt here..."
      />
      <button onClick={generateStory}>Generate Story</button>
      <div>{story}</div>
    </div>
  );
}

export default App;