const axios = require('axios');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const generateResponse = async (prompt, model = 'deepseek/deepseek-r1-0528:free', isKidsMode = false, language = '', aiRole = 'DM') => {
  try {
    let systemMessage = (
      "You are an adaptive RPG AI capable of playing both as a Dungeon Master and as a Player character. " +
      "Respond appropriately based on the role specified in the prompt. " +
      "Keep your responses concise and relevant to the game context."
    );

    if (aiRole === 'DM') {
      systemMessage += (
        " Respond in JSON format, with the following keys: 'role', 'content', 'options' (for multiple choice questions or actions)." +
        " e.g. {\"role\": \"Dungeon Master\", \"content\": \"Story content\", \"options\": [\"Option 1\", \"Option 2\", ...]}."
      );
    }

    if (isKidsMode) {
      systemMessage += (
        " As this is a game for children, ensure all content is family-friendly and appropriate for young audiences. " +
        "Avoid any scary, violent, or adult themes. Focus on positive, educational, and fun experiences. " +
        "Use simple language and explain any complex concepts. Encourage teamwork, problem-solving, and creativity. " +
        "Make sure all characters and situations are suitable for children." +
        "Keep the game light-hearted and engaging, with a focus on exploration and discovery." +
        "Use positive reinforcement and encouragement to motivate players." +
        "Use short sentences and simple words to make the game easy to understand." +
        "Encourage players to use their imagination and creativity to solve problems." +
        "Use icons when it makes sense to help players understand the game."
      );
    }

    if (language) {
      systemMessage += `\nRespond in language (${language}).`;
    }

    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3000',
          'X-Title': 'AI Dungeonmaster',
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
      throw new Error('Invalid response from OpenRouter API');
    }

    let generatedText = response.data.choices[0].message.content.trim();

    // Safety check for kids mode
    if (isKidsMode) {
      const safetyResponse = await axios.post(
        OPENROUTER_API_URL,
        {
          model,
          messages: [
            { 
              role: 'system', 
              content: "You are a content moderator for children's content. Evaluate the following text and determine if it's suitable for children. If it's not suitable, provide a modified, child-friendly version." 
            },
            { 
              role: 'user', 
              content: `Text: ${generatedText}\n\nIs this text suitable for children? If not, provide a modified version:` 
            }
          ],
          max_tokens: 500,
          temperature: 0.5
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3000',
            'X-Title': 'AI Dungeonmaster - Safety Check',
            'Content-Type': 'application/json'
          }
        }
      );

      if (!safetyResponse.data || !safetyResponse.data.choices || !safetyResponse.data.choices[0] || !safetyResponse.data.choices[0].message) {
        throw new Error('Invalid response from OpenRouter API safety check');
      }

      const safetyResponseText = safetyResponse.data.choices[0].message.content.trim();
      if (safetyResponseText.toLowerCase().includes('not suitable')) {
        generatedText = safetyResponseText.split('Modified version:').pop().trim();
      }
    }

    return generatedText;
  } catch (error) {
    console.error('Error generating OpenRouter response:', error.response?.data || error.message);
    throw error;
  }
};

// Model mapping for OpenRouter
const MODEL_MAPPING = {
  // 'gpt4o-mini': 'openai/gpt-4o-mini',
  'deepseek-r1': 'deepseek/deepseek-r1:free',
  'gemma-3': 'google/gemma-3-27b-it:free',
  'llama': 'meta-llama/llama-4-maverick:free'
};

const getAvailableModels = () => {
  return Object.keys(MODEL_MAPPING);
};

const getMappedModel = (model) => {
  return MODEL_MAPPING[model] || 'openai/gpt-4o-mini';
};

module.exports = {
  generateResponse,
  getAvailableModels,
  getMappedModel
};