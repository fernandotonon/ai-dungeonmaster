# OpenRouter Integration Setup

This document explains how to set up and use OpenRouter.ai instead of the ai-engine for story generation in the AI Dungeon Master game.

## What Changed

The game-server has been updated to use OpenRouter.ai instead of the local ai-engine for story generation. This provides:

- Access to multiple AI models (OpenAI, Anthropic, Google, etc.)
- Better reliability and performance
- No need to run a local AI engine
- Cost-effective model usage

## Setup Instructions

### 1. Get an OpenRouter API Key

1. Go to [OpenRouter.ai](https://openrouter.ai)
2. Sign up for an account
3. Navigate to the API Keys section
4. Create a new API key
5. Copy the API key (it starts with `sk-or-`)

### 2. Configure Environment Variables

1. Copy the `env.example` file to `.env` in the game-server directory:
   ```bash
   cp env.example .env
   ```

2. Edit the `.env` file and add your OpenRouter API key:
   ```
   OPENROUTER_API_KEY=sk-or-your-actual-api-key-here
   ```

3. Optionally, set your site information for OpenRouter rankings:
   ```
   SITE_URL=https://your-domain.com
   SITE_NAME=Your AI Dungeon Master
   ```

### 3. Available Models

The following models are available through OpenRouter:

- `gpt4o-mini` - OpenAI GPT-4o Mini (fast and cost-effective)
- `gemini-pro` - Google Gemini Pro
- `claude-3-opus` - Anthropic Claude 3 Opus (most capable)
- `claude-3-sonnet` - Anthropic Claude 3.5 Sonnet (balanced)

### 4. Features Preserved

All the original ai-engine features are preserved:

- **Kids Mode**: Family-friendly content filtering and safety checks
- **Multi-language Support**: Responses in different languages
- **Role-based AI**: Dungeon Master vs Player character modes
- **JSON Response Format**: Structured responses for DM mode
- **Safety Checks**: Additional content moderation for children's content

### 5. Cost Considerations

OpenRouter charges based on usage. Costs vary by model:

- GPT-4o Mini: Most cost-effective option
- Claude 3.5 Sonnet: Balanced cost and performance
- Claude 3 Opus: Highest quality but more expensive

Monitor your usage on the OpenRouter dashboard.

### 6. Troubleshooting

**Error: "OPENROUTER_API_KEY environment variable is required"**
- Make sure you've set the `OPENROUTER_API_KEY` in your `.env` file

**Error: "Invalid API key"**
- Verify your API key is correct and starts with `sk-or-`
- Check that your OpenRouter account has sufficient credits

**Error: "Model not found"**
- The model mapping in `openrouterService.js` may need updating
- Check OpenRouter's available models documentation

### 7. Migration from AI Engine

The migration is seamless for users. The game interface remains the same, but now uses OpenRouter instead of the local ai-engine:

1. Stop the ai-engine service (no longer needed)
2. Update your environment variables
3. Restart the game-server

### 8. Development

To modify the available models or add new ones, edit the `modelMapping` in `src/services/openrouterService.js`:

```javascript
this.modelMapping = {
  'your-model-name': 'openrouter/model/path',
  // Add more models here
};
```

## Benefits of OpenRouter

1. **No Local Infrastructure**: No need to run GPU-intensive AI models locally
2. **Multiple Providers**: Access to OpenAI, Anthropic, Google, and more
3. **Automatic Fallbacks**: OpenRouter handles model availability
4. **Cost Optimization**: Choose the best model for your budget
5. **Regular Updates**: Access to latest model versions automatically 