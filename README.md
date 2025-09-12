# Clone GPT - AI Chat Application

A production-ready ChatGPT-like application built with React, NestJS, and AI SDK, featuring branching conversations and support for both OpenAI and local Ollama models.

## Features

- 🤖 **Real AI Conversations** - Powered by OpenAI GPT or local Ollama models
- 🌊 **Streaming Responses** - Real-time message streaming for better UX
- 🌳 **Branching Conversations** - Branch off from any message to explore different conversation paths
- 💾 **Persistent Chat History** - Save and resume conversations with Supabase integration
- 📱 **Responsive Design** - Modern UI with TailwindCSS and Radix components
- 🔧 **Flexible AI Provider** - Switch between OpenAI API and local Ollama seamlessly

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: NestJS + Express + TypeScript
- **AI**: Vercel AI SDK with OpenAI provider (compatible with Ollama)
- **Database**: Supabase (optional, for chat persistence)
- **UI Components**: Radix UI + Lucide React icons

## Quick Start

### 1. Environment Setup

Copy the example environment file and configure it:

```bash
cp env.example .env
```

**For OpenAI (Cloud):**

```bash
OPENAI_API_KEY=your_openai_api_key_here
# Leave OPENAI_BASE_URL commented out for OpenAI
# MODEL_NAME=gpt-4o-mini
```

**For Ollama (Local):**

```bash
OPENAI_API_KEY=ollama
OPENAI_BASE_URL=http://127.0.0.1:11434/v1
MODEL_NAME=llama3.1:latest
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Start Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:8080`

## Using with Ollama

This application supports local AI models via Ollama out of the box:

### 1. Install and Start Ollama

```bash
# Install Ollama (see https://ollama.ai)
# Then pull a model:
ollama pull llama3.1:latest

# Start Ollama server
ollama serve
```

### 2. Configure Environment

Update your `.env` file with Ollama settings:

```bash
OPENAI_API_KEY=ollama
OPENAI_BASE_URL=http://127.0.0.1:11434/v1
MODEL_NAME=llama3.1:latest  # or any model you have installed
```

### 3. Start the Application

```bash
pnpm dev
```

The app will now use your local Ollama models instead of OpenAI!

### Supported Models

Any model available in Ollama can be used by setting the `MODEL_NAME` environment variable:

- `llama3.1:latest`
- `llama3.2:latest`
- `mistral:latest`
- `codellama:latest`
- And many more...

## Project Structure

```
client/                   # React frontend
├── components/          # UI components
│   ├── chat/           # Chat-specific components
│   └── ui/             # Reusable UI components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and API functions
└── pages/              # Route components

server/                   # NestJS backend
├── chat/               # Chat module (services, controllers, DTOs)
├── routes/             # Express route handlers (legacy)
├── services/           # Business logic services
└── entities/           # Database entities

shared/                   # Shared types between client/server
└── api.ts              # API interfaces and types
```

## API Endpoints

- `GET /api/ping` - Health check
- `POST /api/chat` - Non-streaming chat completion
- `POST /api/chat/stream` - Streaming chat completion
- `POST /api/chat/persistent` - Chat with database persistence
- `POST /api/chat/persistent/stream` - Streaming chat with persistence

## Development Commands

```bash
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm typecheck        # TypeScript validation
pnpm test             # Run tests
```

## Deployment

### Build for Production

```bash
pnpm build
```

### Environment Variables for Production

Set the following environment variables in your deployment platform:

```bash
# AI Provider Configuration
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://api.openai.com/v1  # or your Ollama URL
MODEL_NAME=gpt-4o-mini  # or your preferred model

# Database (optional)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server
PORT=3000
```

## Features Documentation

### Branching Conversations

- Click the "Branch" button on any message to create a new conversation thread
- Each branch maintains its own conversation history
- Navigate between branches using the conversation tree

### Streaming Responses

- Messages appear in real-time as the AI generates them
- Supports both OpenAI and Ollama streaming
- Graceful fallback for connection issues

### Chat Persistence

- Conversations are automatically saved to Supabase (when configured)
- Resume conversations across sessions
- Full conversation history and branching preserved

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
