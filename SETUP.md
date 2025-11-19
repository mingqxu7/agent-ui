# Agent-UI Setup for Chat-SOP Backend

## Important: Backend Compatibility

Your `chat-sop` backend is **NOT** an AgentOS server. It's a RAG chatbot with WebSocket support.

The agent-ui was originally built for AgentOS, which has these endpoints:
- ❌ `/agents` - NOT available in chat-sop
- ❌ `/teams` - NOT available in chat-sop
- ❌ `/sessions` - NOT available in chat-sop

Your backend HAS:
- ✅ `/health` - Health check (just added)
- ✅ `/api/token` - JWT token generation
- ✅ `/chat` - WebSocket chat endpoint

## Quick Fix

### Option 1: Simple Mode (Recommended for Now)

The easiest approach is to use WebSocket mode directly without the AgentOS features:

1. **Restart your backend** (required for `/health` endpoint):
   ```bash
   # Stop current server (Ctrl+C)
   make start
   # or
   uvicorn main:app --reload --port 9000
   ```

2. **Create a minimal chat page** that bypasses AgentOS features

### Option 2: Add Mock Endpoints (Temporary)

Add these to `main.py` after the `/health` endpoint to prevent 404 errors:

```python
@app.get("/health")
async def health_check():
    """Health check endpoint for the React frontend"""
    return {"status": "ok"}

# Mock endpoints for agent-ui compatibility
@app.get("/agents")
async def get_agents():
    """Mock agents endpoint - returns empty list"""
    return []

@app.get("/teams")
async def get_teams():
    """Mock teams endpoint - returns empty list"""
    return []
```

This will stop the 404 errors, but the agent/team selector won't work properly.

### Option 3: Use WebSocket Directly (Best Long-term)

Create a simplified chat component that:
- Skips agent/team selection
- Connects directly to WebSocket
- Uses the simple chat interface

## What Needs to Happen

The agent-ui's `useChatActions` hook tries to:
1. Check `/health` ✅ (just added)
2. Fetch from `/agents` ❌ (doesn't exist)
3. Fetch from `/teams` ❌ (doesn't exist)
4. Initialize agent/team selector ❌ (won't work)

You need to either:
- **A)** Add mock endpoints (quick fix)
- **B)** Modify agent-ui to skip AgentOS features (better fix)
- **C)** Build a new simple chat UI that only uses WebSocket (cleanest)

## Immediate Steps

1. **First, restart your backend:**
   ```bash
   # In your terminal running the backend
   # Press Ctrl+C to stop
   make start
   ```

2. **Then choose your approach:**

   **Quick Fix - Add to main.py:**
   ```python
   @app.get("/agents")
   async def get_agents():
       return []

   @app.get("/teams")
   async def get_teams():
       return []
   ```

   **Or disable in agent-ui - Modify `useChatActions.ts`:**
   ```typescript
   // Comment out these lines in initialize()
   // teams = await getTeams()
   // agents = await getAgents()
   ```

Would you like me to:
1. Add the mock endpoints to your backend?
2. Modify the agent-ui to work without agents/teams?
3. Create a simplified chat component?
