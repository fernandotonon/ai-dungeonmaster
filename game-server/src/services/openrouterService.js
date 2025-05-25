const axios = require('axios');

class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = 'https://openrouter.ai/api/v1';
    
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }
    
    // Model mapping similar to ai-engine
    this.modelMapping = {
      'gpt4o-mini': 'openai/gpt-4o-mini',
      'gemini-pro': 'google/gemini-pro',
      'claude-3-opus': 'anthropic/claude-3-opus',
      'claude-3-sonnet': 'anthropic/claude-3.5-sonnet'
    };
  }

  async generateResponse(prompt, model, isKidsMode = false, language = '', aiRole = 'DM') {
    try {
      let systemMessage = (
        "You are an adaptive RPG AI capable of playing both as a Dungeon Master and as a Player character. " +
        "Respond appropriately based on the role specified in the prompt. " +
        "Keep your responses concise and relevant to the game context."
      );

      if (aiRole === 'DM' && model !== 'llama') {
        systemMessage += (
          "Respond in JSON format, with the following keys: 'role', 'content', 'options' (for multiple choice questions or actions)." +
          "e.g. { 'role': 'Dungeon Master', 'content': 'Story content', 'options': ['Option 1', 'Option 2', ...] }."
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

      // Map the model to OpenRouter format
      const openRouterModel = this.modelMapping[model] || 'openai/gpt-4o-mini';

      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: openRouterModel,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
          'X-Title': process.env.SITE_NAME || 'AI Dungeon Master'
        }
      });

      let generatedText = response.data.choices[0].message.content.trim();

      // Additional safety check for kids mode content (same as ai-engine)
      if (isKidsMode) {
        const safetyResponse = await this.performSafetyCheck(generatedText, openRouterModel);
        if (safetyResponse) {
          generatedText = safetyResponse;
        }
      }

      return generatedText;
    } catch (error) {
      console.error(`Error generating ${model} response with OpenRouter:`, error.response?.data || error.message);
      throw error;
    }
  }

  async performSafetyCheck(text, model) {
    try {
      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: model,
        messages: [
          {
            role: "system",
            content: "You are a content moderator for children's content. Evaluate the following text and determine if it's suitable for children. If it's not suitable, provide a modified, child-friendly version."
          },
          {
            role: "user",
            content: `Text: ${text}\n\nIs this text suitable for children? If not, provide a modified version:`
          }
        ],
        max_tokens: 500,
        temperature: 0.5
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
          'X-Title': process.env.SITE_NAME || 'AI Dungeon Master'
        }
      });

      const safetyResponse = response.data.choices[0].message.content.trim();
      if (safetyResponse.toLowerCase().includes("not suitable")) {
        const parts = safetyResponse.split("Modified version:");
        const modifiedVersion = parts.length > 1 ? parts[parts.length - 1].trim() : null;
        return modifiedVersion || text;
      }
      return null;
    } catch (error) {
      console.error('Error performing safety check:', error);
      return null; // Return null to use original text if safety check fails
    }
  }

  getAvailableModels() {
    return Object.keys(this.modelMapping);
  }
}

module.exports = new OpenRouterService(); 