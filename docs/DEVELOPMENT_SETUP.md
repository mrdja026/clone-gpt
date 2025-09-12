# Clone-GPT Development Setup

This guide covers setting up the Clone-GPT project with NestJS backend and Supabase database integration.

## Prerequisites

- Node.js 18+ and pnpm
- Supabase account with the prompt-branch-buddy project access
- OpenAI API key

## Environment Setup

1. Copy the environment variables from `.env.example` to `.env`:

```bash
cp env.example .env
```

2. Update `.env` with your actual credentials:

```env
# OpenAI API Configuration
OPENAI_API_KEY=your_actual_openai_api_key

# Supabase Configuration (from prompt-branch-buddy project)
SUPABASE_URL=https://pvajezukfmmxnvzxortm.supabase.co
SUPABASE_ANON_KEY=your_actual_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_actual_supabase_service_role_key

# Optional: Custom ping message
PING_MESSAGE=ping

# Server Configuration
PORT=3001
```

## Development Commands

### Start Frontend Only (React + Vite)

```bash
pnpm dev
```

This starts the frontend on http://localhost:5173

### Start Backend Only (NestJS)

```bash
pnpm dev:server
```

This starts the NestJS backend on http://localhost:3001

### Start Backend in Development Mode

```bash
pnpm start:dev
```

Alternative way to start the backend

### Build for Production

```bash
pnpm build
```

This builds both frontend and backend

### Start Production Server

```bash
pnpm start
```

This starts the production server with both frontend and backend

## API Endpoints

### Legacy Endpoints (Express compatibility)

- `GET /api/ping` - Health check
- `GET /api/demo` - Demo endpoint
- `POST /api/chat` - Non-streaming chat (legacy)
- `POST /api/chat/stream` - Streaming chat (legacy)

### Enhanced Endpoints (with Supabase persistence)

- `POST /api/chat/persistent` - Non-streaming chat with database persistence
- `POST /api/chat/persistent/stream` - Streaming chat with database persistence
- `GET /api/chat/history?chatId=uuid&userId=uuid` - Get chat history

### Database Management Endpoints

- `GET /api/chats` - List all chats
- `POST /api/chats` - Create new chat
- `GET /api/chats/:id` - Get specific chat
- `GET /api/chats/:id/messages` - Get messages for a chat
- `PATCH /api/chats/:id` - Update chat
- `DELETE /api/chats/:id` - Delete chat

### Query Templates

- `GET /api/query-templates` - List all query templates
- `GET /api/query-templates?category=Development` - Filter by category
- `POST /api/query-templates` - Create new template
- `GET /api/query-templates/:id` - Get specific template
- `PATCH /api/query-templates/:id` - Update template
- `DELETE /api/query-templates/:id` - Delete template

## Database Schema

The application uses the existing Supabase schema from prompt-branch-buddy:

- `chats` - Main conversations
- `messages` - Individual chat messages
- `branches` - Conversation branching (future use)
- `query_templates` - Predefined query templates
- `users` - User profiles and preferences

## Architecture

### Backend Structure

- `server/main.ts` - NestJS application entry point
- `server/app.module.ts` - Main application module
- `server/chat/` - Chat functionality (legacy + enhanced)
- `server/services/` - Database services
- `server/controllers/` - API controllers
- `server/entities/` - Database entity definitions
- `server/supabase/` - Supabase client configuration
- `server/types/` - TypeScript type definitions

### Frontend Structure (unchanged)

- `client/` - React application
- `client/pages/Index.tsx` - Main chat interface
- `client/components/chat/` - Chat components
- `shared/api.ts` - Shared types between frontend and backend

## Migration Progress

✅ **Phase 1**: NestJS backend infrastructure setup
✅ **Phase 2**: Supabase integration and database services
✅ **Phase 2**: Enhanced chat functionality with persistence
🔄 **Phase 3**: Authentication system (pending)
🔄 **Phase 4**: Frontend Supabase client integration (in progress)
⏳ **Phase 5**: Real-time subscriptions and complete data persistence

## Development Tips

1. **Database First**: The application now persists conversations automatically when using the `/api/chat/persistent/*` endpoints.

2. **Backward Compatibility**: Legacy endpoints (`/api/chat` and `/api/chat/stream`) still work without database persistence for testing.

3. **TypeScript Types**: All database types are generated from Supabase and available in `server/types/database.types.ts`.

4. **Error Handling**: The application includes comprehensive error handling and logging.

5. **Hot Reload**: Use `pnpm dev:server` for backend development with hot reload.

## Next Steps

1. Set up environment variables
2. Install dependencies: `pnpm install`
3. Start development server: `pnpm dev:server`
4. Test API endpoints with your preferred HTTP client
5. Integrate frontend with new persistent endpoints
