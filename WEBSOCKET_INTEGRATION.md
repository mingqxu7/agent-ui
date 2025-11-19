# WebSocket Integration for Agent UI

## Overview

The agent-ui has been updated to support WebSocket communication with the backend at `localhost:9000`, matching the communication pattern used in `templates/index.html`.

## Changes Made

### 1. Updated Default Endpoint

**Files Modified:**
- `src/store.ts` (line 84)
- `src/components/chat/Sidebar/Sidebar.tsx` (line 175)

Changed the default endpoint from `http://localhost:7777` to `http://localhost:9000`.

### 2. New WebSocket Communication Hook

**New File:** `src/hooks/useWebSocketChat.tsx`

A custom React hook that manages WebSocket connections with the following features:
- Automatic URL conversion (http → ws, https → wss)
- JWT authentication support via query parameter
- Message sending with JSON formatting
- Connection lifecycle management (connect, disconnect, reconnect)
- Ready state checking

**Key Functions:**
- `connect()`: Establishes WebSocket connection
- `sendMessage(question, refData)`: Sends chat messages
- `disconnect()`: Closes connection
- `reconnect()`: Reconnects after disconnection
- `isOpen()`: Checks if connection is open
- `isConnecting()`: Checks if connection is connecting

### 3. WebSocket Stream Handler

**New File:** `src/hooks/useWebSocketStreamHandler.tsx`

A hook that integrates WebSocket communication with the existing chat UI state management. It handles:

**Message Types** (based on backend format):
- `start`: Bot begins responding
- `stream`: Streaming content chunks
- `info`: Status/info messages
- `end`: Response complete
- `error`: Error occurred

**Features:**
- Automatic connection management
- Message streaming and state updates
- Error handling with user feedback
- Integration with existing message store

### 4. Updated Chat Input Component

**File Modified:** `src/components/chat/ChatArea/ChatInput/ChatInput.tsx`

The ChatInput component now supports both communication modes:
- **WebSocket mode** (default): Uses `useWebSocketStreamHandler`
- **HTTP streaming mode**: Uses `useAIChatStreamHandler`

The mode is controlled by the `useWebSocket` state in the store.

### 5. Store Updates

**File Modified:** `src/store.ts`

Added new state:
- `useWebSocket: boolean` - Toggle between WebSocket and HTTP streaming
- `setUseWebSocket()` - Update the communication mode

This setting is persisted to localStorage.

### 6. Automatic Token Management

**New Files:**
- `src/hooks/useAuthToken.tsx` - Auto-fetches and refreshes JWT tokens
- `src/api/routes.ts` - Added `GetToken` route
- `src/api/os.ts` - Added `getTokenAPI` function

**Features:**
- Fetches token from `/api/token` on mount
- Automatically refreshes token 5 minutes before expiration
- Stores token in global state and localStorage
- Gracefully handles cases where auth is not required
- Allows manual token override via UI

## WebSocket Message Format

### Outgoing (Client → Server)
```json
{
  "question": "Your question here",
  "ref_data": {}
}
```

### Incoming (Server → Client)
```json
{
  "sender": "bot",
  "type": "start|stream|info|end|error",
  "message": "Response content"
}
```

## Authentication

### Automatic Token Fetching

The agent-ui now automatically fetches JWT tokens from the backend's `/api/token` endpoint.

**New Hook:** `src/hooks/useAuthToken.tsx`

This hook:
- Automatically fetches token on component mount
- Stores token in global state (persisted to localStorage)
- Auto-refreshes token 5 minutes before expiration
- Falls back gracefully if auth is not required

**Token Endpoint:** `GET /api/token`

Response format:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "valid_until": 1735689600
}
```

If authentication is not required (`AUTH_REQUIRED=false` in backend):
```json
{
  "token": null,
  "valid_until": null
}
```

### Manual Token Override

Users can still manually set a token via the UI (AuthToken component in sidebar), which will override the auto-fetched token. The auto-fetch only runs if no token is currently set.

## Backend Endpoints

### WebSocket Chat
The WebSocket connects to: `ws://localhost:9000/chat?jwt=<token>`

This matches the endpoint defined in `main.py:1539`:
```python
@app.websocket("/chat")
async def websocket_endpoint(websocket: WebSocket, ...):
    ...
```

### Token Generation
REST endpoint: `GET http://localhost:9000/api/token`

Defined in `main.py:318`:
```python
@app.get("/api/token")
async def get_token():
    """Generate and return a JWT token for the React frontend"""
    ...
```

### Health Check
REST endpoint: `GET http://localhost:9000/health`

Defined in `main.py:311`:
```python
@app.get("/health")
async def health_check():
    """Health check endpoint for the React frontend"""
    return {"status": "ok"}
```

Used by the agent-ui to verify backend availability before initializing.

## Usage

### Development

1. **Start the backend:**
   ```bash
   # From project root
   make start
   # or
   uvicorn main:app --reload --port 9000
   ```

2. **Start the agent-ui:**
   ```bash
   cd agent-ui
   pnpm install
   pnpm dev
   ```

3. The UI will automatically connect to `localhost:9000` via WebSocket.

### Authentication Setup

The token is automatically fetched from the backend when the app loads. No manual configuration needed!

**How it works:**
1. App loads → `useAuthToken` hook is called in Sidebar
2. Hook fetches token from `GET /api/token`
3. Token is stored in global state and localStorage
4. WebSocket connection uses this token automatically
5. Token auto-refreshes 5 minutes before expiration

**If backend has `AUTH_REQUIRED=false`:**
- `/api/token` returns `{ token: null, valid_until: null }`
- WebSocket connects without token parameter
- Everything works normally

**Manual override:**
- Click "Auth Token" in sidebar to manually enter/edit token
- Manual token takes precedence over auto-fetched token

### Switching Between Modes

To switch between WebSocket and HTTP streaming:

**Option 1: Via Code**
```typescript
// In your component
const { setUseWebSocket } = useStore()
setUseWebSocket(true)  // Enable WebSocket
setUseWebSocket(false) // Use HTTP streaming
```

**Option 2: Via Store**
The setting is persisted, so it will be remembered across sessions.

**Default:** WebSocket mode is enabled by default (`useWebSocket: true`)

## Key Differences from HTTP Streaming

| Feature | WebSocket | HTTP Streaming |
|---------|-----------|----------------|
| Connection | Persistent | Per-request |
| Endpoint | `/chat` | `/agents/{id}/run` or `/teams/{id}/run` |
| Message Format | Simple JSON with sender/type/message | Complex event-based format |
| Authentication | Query parameter (`?jwt=`) | Authorization header |
| Token Source | Auto-fetched from `/api/token` | Auto-fetched from `/api/token` |
| Token Refresh | Automatic (5 min before expiry) | Automatic (5 min before expiry) |
| Reconnection | Manual via reconnect() | Automatic per request |
| Use Case | Simple chat interface | Agent/team-based workflows |

## Testing

To test the WebSocket connection:

1. Open browser DevTools → Network → WS tab
2. Send a message in the chat
3. You should see:
   - WebSocket connection to `ws://localhost:9000/chat`
   - Outgoing message with your question
   - Incoming messages with `type: "start"`, `type: "stream"`, `type: "end"`

## Troubleshooting

### Connection fails
- Ensure backend is running on port 9000
- Check if WebSocket endpoint is enabled in backend
- Verify JWT token if authentication is required

### Messages not appearing
- Check browser console for WebSocket errors
- Verify message format matches expected structure
- Check `useWebSocket` state value in store

### Token issues
- Check Network tab for `/api/token` request
- Verify backend has `AUTH_REQUIRED` properly configured
- Check console for token fetch errors
- Manually set token via sidebar if auto-fetch fails

### Switching doesn't work
- Clear localStorage and refresh
- Check that both handlers are imported correctly
- Verify store state is properly updated

## Implementation Summary

### Files Created
- `src/hooks/useWebSocketChat.tsx` - WebSocket connection management
- `src/hooks/useWebSocketStreamHandler.tsx` - WebSocket stream handling for chat
- `src/hooks/useAuthToken.tsx` - Automatic token fetching and refresh
- `agent-ui/WEBSOCKET_INTEGRATION.md` - This documentation

### Files Modified
- `src/store.ts` - Added `useWebSocket` state
- `src/components/chat/ChatArea/ChatInput/ChatInput.tsx` - Dual-mode support
- `src/components/chat/Sidebar/Sidebar.tsx` - Token auto-fetch initialization
- `src/api/routes.ts` - Added `GetToken` route
- `src/api/os.ts` - Added `getTokenAPI` function

### Key Features
✅ WebSocket communication with localhost:9000
✅ Automatic JWT token fetching from `/api/token`
✅ Token auto-refresh before expiration
✅ Backward compatible with HTTP streaming
✅ Manual token override support
✅ Graceful handling of auth-disabled backends

## Future Improvements

1. Add automatic reconnection on disconnect
2. Add connection status indicator in UI
3. Implement heartbeat/ping-pong for connection health
4. Add WebSocket debugging panel
5. Support session management via WebSocket
6. Add token expiry warning notification
