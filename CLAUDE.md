# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-Powered Holodeck-Style Online RPG with real-time multiplayer capabilities. The system consists of:
- **Frontend**: React SPA with Material-UI, Socket.io for real-time communication
- **Game Server**: Node.js/Express backend with MongoDB, Socket.io, and Firebase push notifications
- **AI Engine**: Python Flask server integrating OpenAI, Google Gemini, and local AI models
- **Android App**: Kotlin app with WebView and Firebase Messaging
- **Infrastructure**: Docker Compose orchestration, MinIO for media storage, Cloudflare tunnel support

## Development Commands

### Frontend (React)
```bash
cd frontend
npm install          # Install dependencies
npm start           # Dev server on port 3000
npm run build       # Production build
npm test            # Run tests
npm run format      # Format code with Prettier
npm run deploy      # Deploy to GitHub Pages (rpg.ftonon.uk)
```

### Game Server (Node.js)
```bash
cd game-server
npm install          # Install dependencies
npm run dev         # Dev with nodemon
npm start           # Production server
npm run format      # Format code with Prettier
```

### AI Engine (Python)
```bash
cd ai-engine
python3 -m venv venv
source venv/bin/activate  # Activate virtual environment
pip install -r requirements.txt
python app.py       # Run Flask server
```

### Docker Development
```bash
# Run all services (frontend on 80/443, game-server on 3000, MongoDB on 27017, MinIO on 9000/9001)
docker compose --env-file ./.env up --build

# With GPU support for AI models
docker compose --env-file ./.env up --build --gpus all
```

### Android App
```bash
cd android
./gradlew build     # Build APK
./gradlew test      # Run unit tests
```

## Architecture Notes

### Frontend Architecture
- Entry point: `src/index.js` → `App.js`
- Context providers: `SocketContext`, `ThemeContext`, `KidsModeContext` for global state
- Main components:
  - `GameInterface/GameInterface.js`: Core game UI with chat, player list, images
  - `UserInterface/UserInterface.js`: Game selection and user management
  - `AuthInterface.js`: Login/registration flow
- Socket.io events handled in `SocketContext.js`
- API calls via `services/api.js` using axios

### Game Server Architecture
- Entry: `server.js` → `src/app.js`
- Routes:
  - `/api/auth/*`: Authentication endpoints
  - `/api/game/*`: Game management
  - `/api/ai/*`: AI interaction endpoints
- Socket.io handlers in `services/socketService.js` for real-time game events
- MongoDB models: `User.js`, `Game.js`
- MinIO integration for audio/image storage
- Firebase Admin SDK for push notifications to Android clients
- OpenRouter.ai integration in `services/openRouterService.js` for story generation
  - Supports GPT-4o-mini, Gemini Pro, and free Llama models
  - Maintains same safety rules and kids mode from original ai-engine

### AI Integration (OpenRouter)
- Story generation now uses OpenRouter.ai directly from game-server
- Preserves all original rules: JSON format responses, kids mode safety, language support
- Model mapping: gpt4o-mini → openai/gpt-4o-mini, gemini-pro → google/gemini-pro-1.5
- Still uses ai-engine for image generation and TTS (if enabled)

### Key Socket Events
- `joinGame`, `leaveGame`: Player management
- `sendMessage`: Player actions
- `gameUpdate`: State synchronization
- `playerJoined`, `playerLeft`: Presence updates
- `error`: Error handling

## Environment Variables
Required `.env` file for Docker Compose:
- MongoDB connection (set in docker-compose.yml)
- MinIO credentials (set in docker-compose.yml)
- OpenRouter API key: `OPENROUTER_API_KEY`
- OpenRouter referer: `OPENROUTER_REFERER` (optional, defaults to http://localhost:3000)
- JWT secrets (set in docker-compose.yml)
- Email service: `GMAIL_USER`, `GMAIL_APP_PASSWORD`
- Firebase: `FIREBASE_PROJECT_ID`
- Frontend: `PUBLIC_URL`, `API_URL`
- Cloudflare tunnel: `CLOUDFLARE_TUNNEL_TOKEN` (optional)

## External Access
For development with external access:
```bash
cloudflared tunnel --url http://localhost:3000
```