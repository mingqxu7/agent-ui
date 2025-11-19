# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent UI is a modern Next.js chat interface for AgentOS-compatible backends. It supports dual connection modes (WebSocket and HTTP streaming) with automatic JWT authentication, real-time streaming responses, and rich message features including tool calls, reasoning steps, and multimedia content.

**Note:** This UI was originally designed for AgentOS but has been adapted for the chat-sop RAG backend. See `SETUP.md` for compatibility notes.

## Tech Stack

- **Framework:** Next.js 15.2.3 with App Router
- **Language:** TypeScript
- **State Management:** Zustand with localStorage persistence
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Styling:** Tailwind CSS
- **Markdown:** react-markdown with rehype/remark plugins
- **Animation:** Framer Motion
- **Package Manager:** pnpm

## Common Commands

```bash
# Development
pnpm dev              # Start dev server on port 3000
pnpm build            # Build for production
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint issues
pnpm format           # Check formatting with Prettier
pnpm format:fix       # Fix formatting issues
pnpm typecheck        # Run TypeScript compiler checks
pnpm validate         # Run lint + format + typecheck (full validation)

# Deployment
vercel                # Deploy to Vercel (preview)
vercel --prod         # Deploy to production
```

## Architecture Overview

### Core Design Patterns

**1. Zustand Store (`src/store.ts`)**
- Single centralized store for global state
- Persists selected endpoint, WebSocket mode, and chat sessions to localStorage
- Key state includes: messages, streaming status, auth token, agents/teams, sessions
- **Chat Sessions**: `chatSessions` is a Record mapping session IDs to message arrays, enabling persistent chat history across page reloads

**2. Dual Communication Modes**
- **WebSocket Mode** (default): Real-time bidirectional via `useWebSocketChat` hook
  - Connects to `/chat` endpoint with JWT in query param
  - Simple message format: `{ question, ref_data }`
  - Auto-reconnect capability

- **HTTP Streaming Mode**: Event-stream based via `useAIStreamHandler`
  - Connects to `/agents/{id}/run` or `/teams/{id}/run`
  - Complex event-based format (RunEvent enum)
  - FormData-based requests with multipart support

**3. Streaming Response Handling**
Two parallel streaming implementations:

- `useAIResponseStream`: Low-level HTTP streaming with JSON parsing
  - Incremental buffer parsing to extract complete JSON objects
  - Supports both legacy and new event/data formats
  - Handles partial chunks across network boundaries

- `useWebSocketStreamHandler`: WebSocket message processing
  - Message types: start, stream, info, end, error
  - Direct integration with WebSocket hook
  - Manages chat session persistence across multiple conversations
  - Supports progress indicators via `progressStatus` field on messages
  - Updates both current messages and persisted chat sessions simultaneously

Both handlers update the message store in real-time using React state updates.

**4. Authentication Flow**
- Auto-fetch JWT from `/api/token` endpoint on mount (`useAuthToken` hook)
- Token stored in Zustand store and localStorage
- Auto-refresh 5 minutes before expiration
- Manual override via sidebar AuthToken component
- Graceful handling when auth is disabled on backend

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with theme provider
│   └── page.tsx           # Main chat page (Sidebar + ChatArea)
├── components/
│   ├── chat/
│   │   ├── ChatArea/      # Right panel: messages + input
│   │   │   ├── Messages/  # Message rendering with multimedia
│   │   │   └── ChatInput/ # Input area with dual-mode support
│   │   └── Sidebar/       # Left panel: sessions, mode selector, auth
│   └── ui/                # Reusable UI components (shadcn/ui)
│       ├── typography/    # Markdown rendering, headings, paragraphs
│       └── icon/          # Icon system with custom icons
├── hooks/                 # Custom React hooks
│   ├── useWebSocketChat.tsx           # WebSocket connection management
│   ├── useWebSocketStreamHandler.tsx  # WebSocket + chat state
│   ├── useAIStreamHandler.tsx         # HTTP streaming + chat state
│   ├── useAIResponseStream.tsx        # Low-level HTTP stream parser
│   ├── useAuthToken.tsx               # Auto token fetch/refresh
│   ├── useChatActions.ts              # Message operations
│   └── useSessionLoader.tsx           # Session history loading
├── lib/                   # Utility functions
│   ├── constructEndpointUrl.ts       # URL normalization
│   ├── modelProvider.ts              # Model/provider utilities
│   └── utils.ts                      # General utilities (cn, etc.)
├── api/                   # API client functions
│   ├── routes.ts          # Endpoint URL builders
│   └── os.ts              # API request functions
├── types/
│   └── os.ts              # TypeScript types for messages, agents, events
└── store.ts               # Zustand global state
```

### Key Data Flows

**Message Streaming (HTTP Mode):**
1. User submits message via ChatInput
2. `handleStreamResponse` in `useAIStreamHandler` called
3. Adds user message + empty agent message to store
4. `useAIResponseStream.streamResponse` fetches from API
5. Incremental JSON parsing via `parseBuffer` function
6. Each chunk updates the last agent message via `setMessages`
7. Tool calls, reasoning steps, references accumulated progressively
8. On completion or error, updates message with final state

**WebSocket Flow:**
1. `useWebSocketStreamHandler` auto-connects on mount when token is ready
2. `useWebSocketChat.connect` establishes persistent WS connection
3. User submits → `handleStreamResponse` generates/reuses session ID
4. Adds user + placeholder agent messages to both `messages` and `chatSessions`
5. `sendMessage` sends JSON to backend via WebSocket
6. Backend streams responses as JSON messages
7. `handleWebSocketMessage` processes message types (start, stream, info, end, error)
8. Updates both current `messages` (if viewing this session) and persisted `chatSessions`
9. Progress indicators shown via `progressStatus` field (e.g., "Agent is typing...")
10. Connection persists across multiple messages and sessions

**Session Management:**
1. Sessions are stored locally in `chatSessions` state (persisted to localStorage)
2. Each session ID maps to an array of ChatMessage objects
3. Clicking session updates URL query param (`?session=<id>`)
4. Messages for selected session loaded from `chatSessions[sessionId]`
5. New messages update both `messages` (current view) and `chatSessions[sessionId]` (persistent)
6. If session ID doesn't exist, a new UUID is generated via `crypto.randomUUID()`
7. WebSocket mode uses `streamingSessionIdRef` to track which session receives responses

### Message Type System

The `ChatMessage` interface (in `src/types/os.ts`) represents all message data:

```typescript
interface ChatMessage {
  role: 'user' | 'agent' | 'tool'
  content: string
  tool_calls?: ToolCall[]        // Tool invocations
  images?: string[]              // Image URLs
  videos?: string[]              // Video URLs
  audio?: string[]               // Audio URLs
  response_audio?: { transcript: string }
  created_at: number
  streamingError?: boolean       // UI error state flag
  progressStatus?: string        // Progress indicator text (e.g., "Agent is typing...")
  extra_data?: {
    reasoning_steps?: ReasoningSteps[]
    references?: Reference[]
  }
}
```

Tool calls, reasoning, and references accumulate during streaming via the `processChunkToolCalls` function in `useAIStreamHandler`.

### State Persistence

Zustand middleware persists these fields to localStorage:
- `selectedEndpoint`: Backend URL (default: `http://localhost:9000`)
- `useWebSocket`: Communication mode (default: `true`)
- `chatSessions`: Record<string, ChatMessage[]> - Complete chat history indexed by session ID

This enables chat history to persist across page reloads. The current `messages` array is ephemeral and represents only the active session view.

### Recent Architecture Changes

**Chat History Persistence (WebSocket Mode)**
Recent commits have implemented persistent chat history for WebSocket mode:
- `chatSessions` state maps session IDs to message arrays
- Both `messages` (current view) and `chatSessions[sessionId]` (persistent) are updated simultaneously during streaming
- Session switching loads messages from `chatSessions` instead of making backend API calls
- Progress indicators added via `progressStatus` field for better UX during agent processing
- Connection management improved with auto-connect on mount and token readiness checks

This architecture enables:
- Multiple chat sessions that persist across page reloads
- Instant session switching without backend calls
- Graceful handling of connection states
- Better user feedback during long-running agent operations

## Connection Mode Differences

| Feature | WebSocket | HTTP Streaming |
|---------|-----------|----------------|
| Endpoint | `/chat` | `/agents/{id}/run` or `/teams/{id}/run` |
| Connection | Persistent | Per-request |
| Auth | Query param `?jwt=` | Authorization header |
| Message Format | `{ question, ref_data }` | FormData with `message`, `stream`, `session_id` |
| Response Format | Simple: `{ sender, type, message }` | Complex: RunEvent-based chunks |
| Agent/Team Selection | Not required | Required |
| Chat History | Persisted to localStorage | Ephemeral (HTTP mode may vary) |
| Progress Indicators | Supported via `progressStatus` | Limited support |
| Use Case | Simple chat, RAG backends | AgentOS workflows |

## Backend Compatibility

This UI expects the following endpoints:

**Required for HTTP Mode:**
- `GET /agents` - List available agents
- `GET /teams` - List available teams
- `POST /agents/{agent_id}/run` - Run agent with streaming
- `POST /teams/{team_id}/run` - Run team with streaming
- `GET /agents/{agent_id}/sessions` or `/teams/{team_id}/sessions` - Get sessions

**Required for WebSocket Mode:**
- `WS /chat` - WebSocket chat endpoint
- `GET /api/token` - Get JWT token (returns `{ token, valid_until }`)

**Optional:**
- `GET /health` - Health check

If your backend doesn't support AgentOS endpoints, use WebSocket mode exclusively or add mock endpoints (see `SETUP.md`).

## Important Patterns to Follow

**1. Message Updates Are Immutable**
Always use functional updates when modifying messages. When using WebSocket mode, update both `messages` and `chatSessions`:
```typescript
// Update current view
setMessages((prevMessages) => {
  const newMessages = [...prevMessages]
  const lastMessage = newMessages[newMessages.length - 1]
  lastMessage.content += newContent  // Modify copy
  return newMessages
})

// Update persisted session
setChatSessions((prev) => {
  const sessionMessages = prev[sessionId] || []
  const updatedMessages = [...sessionMessages]
  const lastMessage = updatedMessages[updatedMessages.length - 1]
  if (lastMessage && lastMessage.role === 'agent') {
    lastMessage.content += newContent
  }
  return { ...prev, [sessionId]: updatedMessages }
})
```

**2. Tool Call Deduplication**
The `processToolCall` function in `useAIStreamHandler` handles tool call deduplication by `tool_call_id` or `tool_name + created_at` composite key.

**3. Stream Error Handling**
On streaming errors, set `streamingError: true` on the message and populate `streamingErrorMessage` in store. The UI displays this prominently.

**4. URL State Management**
Use `nuqs` for URL query params (agent, team, session). This enables deep linking and browser back/forward navigation.

**5. Component Hydration**
The store has a `hydrated` flag to prevent hydration mismatches with localStorage. Check this before rendering persisted state.

**6. Progress Indicators**
WebSocket mode supports progress indicators via the `progressStatus` field on ChatMessage objects. This shows status like "Agent is typing..." or "Searching documents..." while the agent works. Clear this field when actual content starts streaming or when complete.

**7. Dual State Management (WebSocket Mode)**
WebSocket mode maintains two separate message stores:
- `messages`: Current session view (ephemeral, resets when switching sessions)
- `chatSessions[sessionId]`: Persistent history (survives page reloads)

When streaming, update both:
- Check if `sessionIdRef.current === currentSessionId` before updating `messages`
- Always update `chatSessions[currentSessionId]` regardless of current view
- This allows streaming to continue correctly even if user switches away from the session

## Common Tasks

**Managing Chat History:**
- Chat sessions are persisted in `chatSessions` state
- Use `setChatSessions` to add/update session messages
- Access specific session: `chatSessions[sessionId]`
- Clear all history: `setChatSessions({})`
- Each session is independent and identified by UUID

**Adding a New Communication Mode:**
1. Create new hook in `src/hooks/useCustomStreamHandler.tsx`
2. Add mode flag to `src/store.ts` state
3. Update ChatInput to conditionally use new handler
4. Add mode toggle to Sidebar if needed
5. Consider whether to implement session persistence like WebSocket mode

**Supporting New Message Types:**
1. Extend `ChatMessage` interface in `src/types/os.ts`
2. Update message rendering in `src/components/chat/ChatArea/Messages/Messages.tsx`
3. Handle new type in stream handlers (`useAIStreamHandler` or `useWebSocketStreamHandler`)
4. If using WebSocket mode, update both `messages` and `chatSessions` to maintain persistence

**Customizing Markdown Rendering:**
Modify `src/components/ui/typography/MarkdownRenderer/inlineStyles.tsx` to add custom components or styles for markdown elements.

**Adding New Agent/Team Metadata:**
Update `AgentDetails` or `TeamDetails` interfaces in `src/types/os.ts` and corresponding API response handling in `src/api/os.ts`.

## Testing Considerations

- **WebSocket**: Use browser DevTools Network → WS tab to inspect messages
- **HTTP Streaming**: Check Network → Fetch/XHR with streaming responses
- **Auth**: Verify `/api/token` request in Network tab; check localStorage for `endpoint-storage` key
- **State**: Install React DevTools and Zustand DevTools for state inspection
- **URL State**: Verify query params update correctly on session/agent/team changes
- **Chat History**: Check localStorage `endpoint-storage` key → `state.chatSessions` to verify persistence
- **Session Switching**: Verify messages update when changing `?session=<id>` URL param
- **Progress Indicators**: Check that `progressStatus` appears during streaming and clears when content arrives

## Deployment

### Vercel (Recommended)

This app is optimized for Vercel deployment:

**Quick Deploy:**
1. Push code to Git repository
2. Import to Vercel at [vercel.com/new](https://vercel.com/new)
3. Select `agent-ui` directory (if monorepo)
4. Configure environment variables (optional):
   - `NEXT_PUBLIC_OS_SECURITY_KEY` - Default auth token
   - `NEXT_PUBLIC_AGENTOS_URL` - Default backend URL
5. Deploy

**Key Files:**
- `vercel.json` - Vercel configuration with build settings and security headers
- `.env.example` - Template for environment variables

**Important Considerations:**
- Backend must be accessible from internet
- Configure CORS to allow Vercel domain
- WebSocket requires wss:// (secure WebSocket)
- Preview deployments created for all PRs/branches

See **VERCEL_DEPLOYMENT.md** for detailed deployment guide including:
- Step-by-step instructions
- Environment variable configuration
- Backend CORS setup
- Custom domain setup
- Troubleshooting

### Other Platforms

The app is a standard Next.js 15 application and can be deployed to:
- **Netlify**: May require adapter for full Next.js support
- **Railway**: Supports Next.js natively
- **Cloudflare Pages**: Use with Next.js adapter
- **Docker**: Build and deploy as containerized app

## Related Documentation

- **README.md**: High-level overview and features
- **VERCEL_DEPLOYMENT.md**: Complete Vercel deployment guide
- **WEBSOCKET_INTEGRATION.md**: Detailed WebSocket implementation notes
- **SETUP.md**: Backend compatibility and setup guide for chat-sop integration
- **CONTRIBUTING.md**: Contribution guidelines
