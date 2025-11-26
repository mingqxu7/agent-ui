'use client'
import { useEffect, useCallback, useState } from 'react'
import { toast } from 'sonner'
import { TextArea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import useAIChatStreamHandler from '@/hooks/useAIStreamHandler'
import useWebSocketStreamHandler from '@/hooks/useWebSocketStreamHandler'
import useHTTPStreamHandler from '@/hooks/useHTTPStreamHandler'
import useAuthToken from '@/hooks/useAuthToken'
import { useQueryState } from 'nuqs'
import Icon from '@/components/ui/icon'
import { AuthError } from '@/lib/http-stream-service'

const ChatInput = () => {
  const {
    chatInputRef,
    useWebSocket,
    isEndpointActive,
    inputMessage,
    setInputMessage,
    setSubmitMessage,
    setRetryMessage
  } = useStore()

  const authError = useStore((state) => state.authError)
  const authErrorMessage = useStore((state) => state.authErrorMessage)
  const interruptedSessionKey = useStore((state) => state.interruptedSessionKey)
  const setAuthError = useStore((state) => state.setAuthError)
  const setInterruptedSessionKey = useStore((state) => state.setInterruptedSessionKey)
  const { refreshToken, hasToken, validateToken } = useAuthToken()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const { handleStreamResponse: handleAgentOSStreamResponse } = useAIChatStreamHandler()
  const { handleStreamResponse: handleWsStreamResponse } =
    useWebSocketStreamHandler({ shouldAutoConnect: true })
  const { handleStreamResponse: handleHttpStreamResponse } = useHTTPStreamHandler()

  const [selectedAgent] = useQueryState('agent')
  const [teamId] = useQueryState('team')
  const isStreaming = useStore((state) => state.isStreaming)

  // Select the appropriate handler based on mode
  // Note: WebSocket uses the chat-sop backend, while AgentOS mode uses HTTP streaming
  const handleStreamResponse = useWebSocket
    ? handleWsStreamResponse
    : selectedAgent || teamId
      ? handleAgentOSStreamResponse
      : handleHttpStreamResponse

  // In WebSocket mode, we don't need agent/team selection
  // In HTTP streaming mode (no agent/team), just need endpoint to be active
  const canChat = useWebSocket
    ? isEndpointActive
    : selectedAgent || teamId
      ? true
      : isEndpointActive

  const handleRefreshToken = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refreshToken()

      // Clear auth error
      setAuthError(false, null)

      // Show success message
      if (interruptedSessionKey) {
        toast.success('Token refreshed! You can now continue your conversation.')
        setInterruptedSessionKey(null)
      } else {
        toast.success('Token refreshed successfully!')
      }
    } catch {
      toast.error('Failed to refresh token. Please try again.')
    } finally {
      setIsRefreshing(false)
    }
  }, [refreshToken, setAuthError, interruptedSessionKey, setInterruptedSessionKey])

  const handleSubmit = useCallback(async () => {
    if (!inputMessage.trim()) return

    // Check auth status for HTTP streaming mode (not WebSocket)
    if (!useWebSocket && (!hasToken || authError || !validateToken())) {
      // Show re-auth notification
      setAuthError(
        true,
        'Please refresh your token before sending a message.'
      )
      return
    }

    const currentMessage = inputMessage
    setInputMessage('')

    try {
      await handleStreamResponse(currentMessage)
    } catch (error) {
      if (error instanceof AuthError) {
        // Auth error during send - already handled by handler
        console.error('Auth error:', error)
      } else {
        toast.error(
          `Error in handleSubmit: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    }
  }, [
    inputMessage,
    setInputMessage,
    handleStreamResponse,
    useWebSocket,
    hasToken,
    authError,
    validateToken,
    setAuthError
  ])

  const handleRetry = useCallback(async (message: string) => {
    console.log('[ChatInput] handleRetry called with message:', message)
    try {
      await handleStreamResponse(message)
      console.log('[ChatInput] handleStreamResponse completed')
    } catch (error) {
      console.error('[ChatInput] Error in retry:', error)
      toast.error(
        `Error in retry: ${error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }, [handleStreamResponse])

  // Register the submit function in the store so it can be called from elsewhere
  useEffect(() => {
    setSubmitMessage(() => handleSubmit)
    return () => setSubmitMessage(null)
  }, [handleSubmit, setSubmitMessage])

  // Register the retry function in the store
  useEffect(() => {
    console.log('[ChatInput] Registering retryMessage function')
    setRetryMessage(handleRetry)
    return () => {
      console.log('[ChatInput] Unregistering retryMessage function')
      setRetryMessage(null)
    }
  }, [handleRetry, setRetryMessage])

  return (
    <div className="relative mx-auto mb-1 w-full max-w-2xl font-geist">
      {/* Auth Error Banner */}
      {authError && !useWebSocket && (
        <div className="mb-3 rounded-lg border border-red-400 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
          <div className="flex items-start">
            <div className="flex-1">
              <h3 className="mb-1 font-semibold text-red-800 dark:text-red-200">
                Authentication Required
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                {authErrorMessage || 'Your session has expired.'}
              </p>
              {interruptedSessionKey && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  Your conversation will resume after refreshing your token.
                </p>
              )}
            </div>
            <Button
              onClick={handleRefreshToken}
              disabled={isRefreshing}
              size="sm"
              className="ml-4 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh Token'}
            </Button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end justify-center gap-x-2">
        <TextArea
          placeholder={
            authError && !useWebSocket
              ? 'Please refresh your token first'
              : 'Ask anything'
          }
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              !e.nativeEvent.isComposing &&
              !e.shiftKey &&
              !isStreaming
            ) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          className="w-full border border-accent bg-accent/50 px-4 text-sm text-primary focus:border-accent"
          disabled={!canChat || (authError && !useWebSocket)}
          ref={chatInputRef}
        />
        <Button
          onClick={handleSubmit}
          disabled={
            !canChat ||
            !inputMessage.trim() ||
            isStreaming ||
            (authError && !useWebSocket)
          }
          size="icon"
          className="rounded-xl bg-primary p-5 text-primaryAccent"
        >
          <Icon type="send" color="primaryAccent" />
        </Button>
      </div>
    </div>
  )
}

export default ChatInput
