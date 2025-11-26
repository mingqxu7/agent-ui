import { useCallback, useState } from 'react'

import {
  AuthError,
  httpStreamService,
  type ChatStreamRequest,
  type SSEMessage
} from '@/lib/http-stream-service'

import useAuthToken from './useAuthToken'

export interface UseHTTPStreamChatOptions {
  endpoint: string
  authToken?: string
  onMessage?: (data: SSEMessage) => void
  onError?: (error: Error) => void
  onComplete?: () => void
  onAuthError?: (sessionKey: string) => void
}

/**
 * Hook for managing HTTP streaming chat connections
 * Handles token validation, streaming, and error handling
 */
export default function useHTTPStreamChat(options: UseHTTPStreamChatOptions) {
  const { validateToken, clearToken } = useAuthToken()
  const [isStreaming, setIsStreaming] = useState(false)

  /**
   * Send a message and start streaming response
   */
  const sendMessage = useCallback(
    async (
      message: string,
      sessionKey: string, // Track which session this is for
      sendOptions?: Omit<ChatStreamRequest, 'message'>
    ) => {
      // Validate token before sending
      if (!validateToken()) {
        const error = new AuthError('Token expired or invalid')
        options.onAuthError?.(sessionKey)
        throw error
      }

      if (!options.authToken) {
        const error = new AuthError('No auth token available')
        options.onAuthError?.(sessionKey)
        throw error
      }

      setIsStreaming(true)

      try {
        await httpStreamService.startStream(
          options.endpoint,
          {
            message,
            ...sendOptions
          },
          options.authToken,
          options.onMessage,
          (error) => {
            // Handle auth errors
            if (error instanceof AuthError) {
              clearToken()
              options.onAuthError?.(sessionKey)
            }
            options.onError?.(error)
          },
          () => {
            setIsStreaming(false)
            options.onComplete?.()
          }
        )
      } catch (error) {
        setIsStreaming(false)
        if (error instanceof AuthError) {
          clearToken()
          options.onAuthError?.(sessionKey)
        }
        throw error
      }
    },
    [
      options,
      validateToken,
      clearToken
    ]
  )

  /**
   * Abort the current stream
   */
  const abort = useCallback(() => {
    httpStreamService.abort()
    setIsStreaming(false)
  }, [])

  return {
    sendMessage,
    abort,
    isStreaming
  }
}
