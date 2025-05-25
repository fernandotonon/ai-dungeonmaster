# ai-dungeonmaster
AI-Powered Holodeck-Style Online RPG

## 🚀 OpenRouter Integration

This project now uses **OpenRouter.ai** instead of the local ai-engine for story generation, providing:

- Access to multiple AI models (OpenAI, Anthropic, Google, etc.)
- Better reliability and performance
- No need for local GPU infrastructure
- Cost-effective model usage

### Quick Setup

1. Get an OpenRouter API key from [OpenRouter.ai](https://openrouter.ai)
2. Copy `game-server/env.example` to `game-server/.env`
3. Add your API key: `OPENROUTER_API_KEY=sk-or-your-key-here`
4. Run: `docker compose up --build`

For detailed setup instructions, see [game-server/OPENROUTER_SETUP.md](game-server/OPENROUTER_SETUP.md)

## Legacy AI Engine Setup (Optional)

The local ai-engine is no longer required but can still be used:

### Create virtual environment
python3 -m venv venv
cd ai-dungeonmaster/ai-engine/ && source venv/bin/activate && python app.py

### Run docker compose
docker compose --env-file ./.env up --build

### rename llama pth file
mv /home/fernando/.llama/checkpoints/Llama3.2-3B/consolidated.00.pth /home/fernando/.llama/checkpoints/Llama3.2-3B/pytorch_model.bin

### run docker compose with gpu
docker compose --env-file ./.env up --build --gpus all

## Development

### Test OpenRouter Integration
```bash
cd game-server
npm run test-openrouter
```

### Cloudflare Quick Tunnel
```bash
cloudflared tunnel --url http://localhost:3000
```