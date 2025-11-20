# Testing Interrupted Message Retry Feature

## Overview
This feature detects when WebSocket connections are interrupted during streaming (e.g., when closing the browser on mobile) and provides a retry button to automatically resend the message.

## How to Test

### Method 1: Manual Testing on Mobile (iPhone)
1. Start the dev server: `pnpm dev`
2. Open the app on iPhone Safari
3. Send a query that takes time to respond
4. **During streaming**, close Safari or switch to another app
5. Reopen Safari - you should see:
   - Partial response content (if any was received)
   - Yellow warning banner saying "Connection Interrupted"
   - "Retry this message" button
6. Click the retry button
7. Check browser console for logs:
   ```
   [Retry] Starting retry for message at index: X
   [Retry] Previous message: {...}
   [Retry] retryMessage function available? true
   [Retry] Calling retryMessage with: "your original query"
   [ChatInput] handleRetry called with message: "your original query"
   [ChatInput] handleStreamResponse completed
   ```

### Method 2: Desktop Testing (Simulate Interruption)
1. Start dev server: `pnpm dev`
2. Open browser DevTools (F12) → Network → WS tab
3. Send a query
4. **During streaming**, manually close the WebSocket connection:
   - In Console, run: `WebSocket.prototype.close.call(window.ws)` (if you can access the WS instance)
   - OR: Disconnect network briefly
5. Message should be marked as interrupted
6. Click retry button

### Method 3: Programmatic Testing
You can add a test button to manually trigger the interruption:

```tsx
// In ChatInput or Messages component
<button onClick={() => {
  const { messages, setMessages, setChatSessions } = useStore.getState()
  const lastMessage = messages[messages.length - 1]
  if (lastMessage && lastMessage.role === 'agent') {
    lastMessage.connectionInterrupted = true
    lastMessage.progressStatus = undefined
    setMessages([...messages])
  }
}}>
  Simulate Interruption
</button>
```

## Expected Behavior

### When Connection Interrupts
1. `isCurrentlyStreamingRef.current` is `true`
2. WebSocket `onClose` handler fires
3. Last agent message gets `connectionInterrupted: true`
4. Both `messages` and `chatSessions[sessionId]` are updated
5. Yellow warning banner appears

### When Retry is Clicked
1. Console logs show retry flow
2. Both user query and interrupted response are removed from UI
3. Original query is automatically re-sent (no manual "Send" click needed)
4. New streaming response begins
5. User sees fresh response

## Debugging

If retry doesn't work, check console logs:

### Function Registration
```
[ChatInput] Registering retryMessage function
```
This should appear when ChatInput mounts.

### Retry Flow
```
[Retry] Starting retry for message at index: 1
[Retry] Previous message: {role: 'user', content: '...'}
[Retry] retryMessage function available? true
[Retry] Calling retryMessage with: "original query"
[ChatInput] handleRetry called with message: "original query"
```

### Common Issues
- **"retryMessage function not available"**: ChatInput hasn't mounted yet or useEffect hasn't run
- **Messages deleted but no new message sent**: Check that `handleStreamResponse` is working
- **TypeScript errors**: Run `pnpm typecheck` to verify

## Code Flow

```
User clicks Retry
  ↓
InterruptedMessage.onRetry()
  ↓
Messages.handleRetryMessage(index)
  ↓
- Removes user + interrupted agent messages
- Calls retryMessage(originalQuery)
  ↓
ChatInput.handleRetry(message)
  ↓
handleStreamResponse(message)
  ↓
WebSocket sends message to backend
```

## Files Modified

1. **src/types/os.ts**: Added `connectionInterrupted` field
2. **src/hooks/useWebSocketStreamHandler.tsx**: Detection logic in `onClose`
3. **src/components/chat/ChatArea/Messages/InterruptedMessage.tsx**: UI component
4. **src/components/chat/ChatArea/Messages/MessageItem.tsx**: Integration
5. **src/components/chat/ChatArea/Messages/Messages.tsx**: Retry handler
6. **src/components/chat/ChatArea/ChatInput/ChatInput.tsx**: `handleRetry` function
7. **src/store.ts**: Added `retryMessage` state

## Clean Up

Once testing is complete and working, you can remove the console.log statements from:
- `Messages.tsx` (lines 189-217)
- `ChatInput.tsx` (lines 44, 47, 49, 65, 68)
