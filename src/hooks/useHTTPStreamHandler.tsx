import { useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

import { useStore } from '@/store'
import { type ChatMessage } from '@/types/os'
import { constructEndpointUrl } from '@/lib/constructEndpointUrl'
import { AuthError, type SSEMessage } from '@/lib/http-stream-service'

import useHTTPStreamChat from './useHTTPStreamChat'
import useAuthToken from './useAuthToken'

export interface HTTPStreamOptions {
  belief_system?: string
  style?: string
  scenario_id?: number
  language?: string
  ref_question?: string
}

/**
 * Hook that handles HTTP streaming chat with state management
 * Integrates with Zustand store and manages session ID mapping
 */
export default function useHTTPStreamHandler() {
  const searchParams = useSearchParams()
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)
  const setMessages = useStore((state) => state.setMessages)
  const setChatSessions = useStore((state) => state.setChatSessions)
  const httpSessionIdMap = useStore((state) => state.httpSessionIdMap)
  const setHTTPSessionIdMap = useStore((state) => state.setHTTPSessionIdMap)
  const setAuthError = useStore((state) => state.setAuthError)
  const setInterruptedSessionKey = useStore((state) => state.setInterruptedSessionKey)
  const setIsStreaming = useStore((state) => state.setIsStreaming)
  const setStreamingErrorMessage = useStore((state) => state.setStreamingErrorMessage)

  const { validateToken } = useAuthToken()

  // Get current session key from URL
  const getCurrentSessionKey = useCallback(() => {
    return searchParams.get('session') || 'default'
  }, [searchParams])

  // HTTP stream chat hook
  const httpStreamChat = useHTTPStreamChat({
    endpoint: `${constructEndpointUrl(selectedEndpoint)}/chat`,
    authToken: authToken || undefined,
    onMessage: (data: SSEMessage) => {
      const localSessionKey = getCurrentSessionKey()

      // Capture session_id from 'connected' event
      if (data.type === 'connected' && data.session_id) {
        console.log(`Session connected: ${data.session_id}`)
        setHTTPSessionIdMap((prev) => ({
          ...prev,
          [localSessionKey]: {
            backendId: data.session_id!,
            timestamp: Date.now()
          }
        }))
        return
      }

      // Handle 'start' event
      if (data.type === 'start') {
        console.log('Stream started')
        return
      }

      // Handle 'stream' event - append content to last message
      if (data.type === 'stream' && data.message) {
        setMessages((prevMessages) => {
          const newMessages = [...prevMessages]
          const lastMessage = newMessages[newMessages.length - 1]

          if (lastMessage && lastMessage.role === 'agent') {
            lastMessage.content += data.message
          }

          return newMessages
        })

        // Update chat sessions as well
        setChatSessions((prev) => {
          const sessionMessages = prev[localSessionKey] || []
          const updatedMessages = [...sessionMessages]
          const lastMessage = updatedMessages[updatedMessages.length - 1]

          if (lastMessage && lastMessage.role === 'agent') {
            lastMessage.content += data.message
          }

          return { ...prev, [localSessionKey]: updatedMessages }
        })
        return
      }

      // Handle 'info' event - metadata or progress updates
      if (data.type === 'info') {
        console.log('Info:', data)
        // Could be used for progress indicators
        return
      }

      // Handle 'end' event
      if (data.type === 'end') {
        console.log('Stream ended')
        setIsStreaming(false)
        return
      }

      // Handle 'error' event
      if (data.type === 'error') {
        console.error('Stream error:', data.error || data.message)
        setIsStreaming(false)
        setStreamingErrorMessage(data.error || data.message || 'Unknown error')

        // Mark last message as error
        setMessages((prevMessages) => {
          const newMessages = [...prevMessages]
          const lastMessage = newMessages[newMessages.length - 1]

          if (lastMessage && lastMessage.role === 'agent') {
            lastMessage.streamingError = true
          }

          return newMessages
        })

        setChatSessions((prev) => {
          const sessionMessages = prev[localSessionKey] || []
          const updatedMessages = [...sessionMessages]
          const lastMessage = updatedMessages[updatedMessages.length - 1]

          if (lastMessage && lastMessage.role === 'agent') {
            lastMessage.streamingError = true
          }

          return { ...prev, [localSessionKey]: updatedMessages }
        })
        return
      }
    },
    onError: (error) => {
      console.error('HTTP stream error:', error)
      setIsStreaming(false)

      if (error instanceof AuthError) {
        // Auth error already handled by onAuthError
        return
      }

      setStreamingErrorMessage(error.message)
    },
    onComplete: () => {
      console.log('Stream complete')
      setIsStreaming(false)
    },
    onAuthError: (sessionKey) => {
      console.log('Auth error for session:', sessionKey)
      setAuthError(
        true,
        'Authentication failed. Please refresh your token to continue this conversation.'
      )
      setInterruptedSessionKey(sessionKey)
      setIsStreaming(false)
    }
  })

  /**
   * Handle sending a message and streaming the response
   */
  const handleStreamResponse = useCallback(
    async (message: string, options?: HTTPStreamOptions) => {
      const localSessionKey = getCurrentSessionKey()

      // Validate token first
      if (!validateToken()) {
        setAuthError(
          true,
          'Your session has expired. Please refresh your token to continue.'
        )
        setInterruptedSessionKey(localSessionKey)
        throw new AuthError('Token expired')
      }

      // Look up backend session ID
      const mappingEntry = httpSessionIdMap[localSessionKey]
      const backendSessionId = mappingEntry?.backendId

      // Add user message to state
      const userMessage: ChatMessage = {
        role: 'user',
        content: message,
        created_at: Date.now()
      }

      // Add placeholder agent message
      const agentMessage: ChatMessage = {
        role: 'agent',
        content: '',
        created_at: Date.now()
      }

      setMessages((prev) => [...prev, userMessage, agentMessage])
      setChatSessions((prev) => ({
        ...prev,
        [localSessionKey]: [...(prev[localSessionKey] || []), userMessage, agentMessage]
      }))

      setIsStreaming(true)

      // Send message with backend session_id if we have a mapping
      try {
        await httpStreamChat.sendMessage(message, localSessionKey, {
          session_id: backendSessionId,
          ...options
        })
      } catch (error) {
        console.error('Failed to send message:', error)
        setIsStreaming(false)
        throw error
      }
    },
    [
      getCurrentSessionKey,
      validateToken,
      httpSessionIdMap,
      setMessages,
      setChatSessions,
      setIsStreaming,
      setAuthError,
      setInterruptedSessionKey,
      httpStreamChat
    ]
  )

  /**
   * Abort the current stream
   */
  const abort = useCallback(() => {
    httpStreamChat.abort()
    setIsStreaming(false)
  }, [httpStreamChat, setIsStreaming])

  return {
    handleStreamResponse,
    abort,
    isStreaming: httpStreamChat.isStreaming
  }
}
