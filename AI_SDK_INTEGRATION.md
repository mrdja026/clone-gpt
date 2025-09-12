# AI SDK Integration Documentation

## Overview

This project has been successfully integrated with [Vercel's AI SDK](https://ai-sdk.dev/docs/introduction) to provide real AI-powered conversations instead of mock responses. The integration includes both streaming and non-streaming endpoints for flexibility.

## What's New

### 🤖 Real AI Responses

- Replaced mock `callModel` function with actual OpenAI GPT-4o-mini integration
- Contextual conversations that remember previous messages
- Specialized JiraGPT assistant persona for project management queries

### ⚡ Streaming Support

- Real-time response streaming for better user experience
- Text appears character-by-character as the AI generates it
- Maintains existing branching conversation functionality

### 🔧 API Endpoints

- `POST /api/chat` - Non-streaming chat completion
- `POST /api/chat/stream` - Streaming chat completion

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the project root:

```bash
# Required: OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Custom ping message
PING_MESSAGE=ping
```

**Get your OpenAI API Key:**

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy it to your `.env` file

### 2. Dependencies

The following packages have been installed:

```json
{
  "ai": "^latest",
  "@ai-sdk/openai": "^latest"
}
```

### 3. Start Development

```bash
npm run dev
```

The app will be available at `http://localhost:8080`

## Technical Implementation

### Backend Architecture

#### Chat Route Handler (`server/routes/chat.ts`)

```typescript
// Streaming endpoint
export const handleChat: RequestHandler = async (req, res) => {
  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: "You are JiraGPT, a helpful assistant...",
    messages: messages,
    maxOutputTokens: 1024,
  });

  for await (const textPart of result.textStream) {
    res.write(textPart);
  }
  res.end();
};
```

#### API Registration (`server/index.ts`)

```typescript
app.post("/api/chat", handleChatSync); // Non-streaming
app.post("/api/chat/stream", handleChat); // Streaming
```

### Frontend Integration

#### AI Model Functions (`client/pages/Index.tsx`)

```typescript
// Non-streaming version
async function callModel(prompt: string, conversationHistory: Message[]);

// Streaming version with real-time updates
async function callModelStreaming(
  prompt: string,
  conversationHistory: Message[],
  onUpdate: (chunk: string) => void,
);
```

#### Enhanced onSend Function

- Creates placeholder message for streaming
- Updates message content in real-time
- Maintains conversation context
- Preserves existing branching functionality

### Type Safety

#### Shared Types (`shared/api.ts`)

```typescript
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt?: string;
}

export interface ChatResponse {
  message: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

## Features

### 🎯 Contextual Conversations

- Full conversation history sent to AI for context
- Each branch maintains its own conversation thread
- Seamless integration with existing branching system

### 📊 Token Usage Tracking

- Monitor API usage with detailed token information
- Cost tracking for prompt and completion tokens
- Available in non-streaming endpoint response

### 🔄 Graceful Fallbacks

- Comprehensive error handling
- Helpful fallback messages when AI is unavailable
- Maintains app functionality even during API issues

### 🚀 Performance Optimized

- Streaming responses for immediate feedback
- Efficient token usage with GPT-4o-mini model
- Minimal latency with proper async handling

## Usage Examples

### Basic Chat Query

```
User: "Show details for issue ABC-123 including status, assignee, and blockers."
AI: "I'll help you analyze issue ABC-123. Based on typical Jira workflows..."
```

### Branch Conversations

1. Send initial query
2. Get AI response
3. Click "Branch" on any message
4. Continue conversation from that point
5. AI maintains context of the branched conversation

### Query Templates

The app includes predefined query templates:

- Get Jira issue details
- List issues by priority
- Generate release notes
- Find blockers for epics
- Create sprint plans

## Troubleshooting

### Common Issues

1. **"Cannot find module 'ai'"**
   - Run: `npm install ai @ai-sdk/openai`

2. **API Key Errors**
   - Verify `.env` file exists and contains valid `OPENAI_API_KEY`
   - Check OpenAI account has available credits

3. **TypeScript Errors**
   - Run: `npx tsc --noEmit` to check for type issues
   - Ensure all dependencies are properly installed

4. **Streaming Not Working**
   - Check browser DevTools for network errors
   - Verify `/api/chat/stream` endpoint is accessible

### Debug Mode

Enable detailed logging:

```bash
DEBUG=ai:* npm run dev
```

## Cost Considerations

- **Model**: GPT-4o-mini (cost-effective choice)
- **Token Limit**: 1024 max output tokens per request
- **Context**: Full conversation history sent (affects input token cost)
- **Monitoring**: Use token usage data to track costs

## Migration Notes

### From Mock to Real AI

- ✅ Preserved all existing UI functionality
- ✅ Maintained branching conversation system
- ✅ Added streaming for better UX
- ✅ Enhanced with contextual awareness
- ✅ Improved error handling

### Backwards Compatibility

- All existing conversation data remains functional
- UI components unchanged
- Storage mechanism preserved
- Branching logic intact

## Next Steps

### Potential Enhancements

1. **Multiple AI Providers**: Add Anthropic, Google Gemini support
2. **Tool Calling**: Integrate actual Jira API calls
3. **Custom Models**: Fine-tuned models for specific use cases
4. **Advanced Streaming**: Add typing indicators and partial message rendering
5. **Conversation Export**: Save conversations with AI metadata

### Production Deployment

1. Set up environment variables in your deployment platform
2. Configure rate limiting for API endpoints
3. Add API key rotation mechanism
4. Implement usage monitoring and alerts

## Resources

- [AI SDK Documentation](https://ai-sdk.dev/docs/introduction)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Vercel AI SDK GitHub](https://github.com/vercel/ai)
- [AI SDK Cookbook](https://ai-sdk.dev/cookbook)

---

**🎉 Your clone-gpt project now has real AI capabilities with streaming support!**
