import { useCallback, useRef, useEffect } from 'react'

import useChatActions from '@/hooks/useChatActions'
import { useStore } from '../store'
import { constructEndpointUrl } from '@/lib/constructEndpointUrl'
import useWebSocketChat from './useWebSocketChat'
import useAuthToken from './useAuthToken'
import { useQueryState } from 'nuqs'

interface WebSocketMessage {
  sender: 'bot' | 'user'
  type: 'start' | 'stream' | 'info' | 'end' | 'error'
  message: string
}

const useWebSocketStreamHandler = () => {
  const setMessages = useStore((state) => state.setMessages)
  const { addMessage, focusChatInput } = useChatActions()
  const [sessionId, setSessionId] = useQueryState('session')
  const sessionIdRef = useRef(sessionId)
  const setChatSessions = useStore((state) => state.setChatSessions)

  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const setStreamingErrorMessage = useStore(
    (state) => state.setStreamingErrorMessage
  )
  const setIsStreaming = useStore((state) => state.setIsStreaming)
  const { connect, sendMessage, disconnect } = useWebSocketChat()

  // Use the auto-fetching token hook
  const { token: authToken, isLoading: isTokenLoading } = useAuthToken()

  const isConnectedRef = useRef(false)
  const currentResponseRef = useRef('')
  const streamingSessionIdRef = useRef<string | null>(null)

  const updateMessagesWithErrorState = useCallback(() => {
    setMessages((prevMessages) => {
      const newMessages = [...prevMessages]
      const lastMessage = newMessages[newMessages.length - 1]
      if (lastMessage && lastMessage.role === 'agent') {
        lastMessage.streamingError = true
      }
      return newMessages
    })
  }, [setMessages])

  const handleWebSocketMessage = useCallback(
    (data: WebSocketMessage, currentSessionId: string) => {
      if (data.sender === 'bot') {
        if (data.type === 'start') {
          // Bot is starting to respond
          currentResponseRef.current = ''
          setIsStreaming(true)
          if (sessionIdRef.current === currentSessionId) {
            setMessages((prevMessages) => {
              const newMessages = [...prevMessages]
              const lastMessage = newMessages[newMessages.length - 1]
              if (lastMessage && lastMessage.role === 'agent') {
                lastMessage.progressStatus = 'Agent is typing...'
              }
              return newMessages
            })
          }
        } else if (data.type === 'stream') {
          // Streaming content
          currentResponseRef.current += data.message
          // Update chatSessions with partial content
          setChatSessions((prev) => {
            const sessionMessages = prev[currentSessionId] || []
            const updatedMessages = [...sessionMessages]
            const lastMessage = updatedMessages[updatedMessages.length - 1]
            if (lastMessage && lastMessage.role === 'agent') {
              lastMessage.content = currentResponseRef.current
              lastMessage.progressStatus = undefined
            }
            return {
              ...prev,
              [currentSessionId]: updatedMessages
            }
          })

          if (sessionIdRef.current === currentSessionId) {
            setMessages((prevMessages) => {
              const newMessages = [...prevMessages]
              const lastMessage = newMessages[newMessages.length - 1]
              if (lastMessage && lastMessage.role === 'agent') {
                lastMessage.content = currentResponseRef.current
                // Clear progress status when actual content is streaming
                lastMessage.progressStatus = undefined
              }
              return newMessages
            })
          }
        } else if (data.type === 'info') {
          // Info message - update progress status in the last agent message
          console.log('Info:', data.message)
          // Update chatSessions with progress status
          setChatSessions((prev) => {
            const sessionMessages = prev[currentSessionId] || []
            const updatedMessages = [...sessionMessages]
            const lastMessage = updatedMessages[updatedMessages.length - 1]
            if (lastMessage && lastMessage.role === 'agent') {
              lastMessage.progressStatus = data.message
            }
            return {
              ...prev,
              [currentSessionId]: updatedMessages
            }
          })

          if (sessionIdRef.current === currentSessionId) {
            setMessages((prevMessages) => {
              const newMessages = [...prevMessages]
              const lastMessage = newMessages[newMessages.length - 1]
              if (lastMessage && lastMessage.role === 'agent') {
                lastMessage.progressStatus = data.message
              }
              return newMessages
            })
          }
        } else if (data.type === 'end') {
          // Response complete
          currentResponseRef.current += data.message
          // Update chatSessions with the final message
          setChatSessions((prev) => {
            const sessionMessages = prev[currentSessionId] || []
            const updatedMessages = [...sessionMessages]
            const lastMessage = updatedMessages[updatedMessages.length - 1]
            if (lastMessage && lastMessage.role === 'agent') {
              lastMessage.content = currentResponseRef.current
              lastMessage.progressStatus = undefined
            }
            return {
              ...prev,
              [currentSessionId]: updatedMessages
            }
          })

          if (sessionIdRef.current === currentSessionId) {
            setMessages((prevMessages) => {
              const newMessages = [...prevMessages]
              const lastMessage = newMessages[newMessages.length - 1]
              if (lastMessage && lastMessage.role === 'agent') {
                lastMessage.content = currentResponseRef.current
                lastMessage.progressStatus = undefined // Clear progress status on completion
              }
              return newMessages
            })
          }
          setIsStreaming(false)
          focusChatInput()
          currentResponseRef.current = ''
        } else if (data.type === 'error') {
          // Error occurred
          currentResponseRef.current += data.message
          updateMessagesWithErrorState()
          setStreamingErrorMessage(data.message)
          setIsStreaming(false)
          focusChatInput()
          currentResponseRef.current = ''
        }
      }
    },
    [
      setMessages,
      setIsStreaming,
      setStreamingErrorMessage,
      focusChatInput,
      updateMessagesWithErrorState,
      setChatSessions
    ]
  )

  const ensureConnection = useCallback(() => {
    if (!isConnectedRef.current) {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)

      connect({
        endpoint: endpointUrl,
        authToken,
        onMessage: (data) => {
          // We need to pass the session ID to the handler. 
          // However, onMessage signature in useWebSocketChat doesn't support it directly if we bind it here.
          // But handleWebSocketMessage needs to know the session ID of the *stream*.
          // The WebSocket is persistent. The session ID is per *message*? 
          // No, the WebSocket is for the chat.
          // Actually, useWebSocketChat is a simple wrapper.
          // We need to store the current stream's session ID in a ref?
          // Or pass it when we send the message?
          // The server response doesn't seem to include session ID in the WebSocket message (based on interface).
          // So we must assume the response belongs to the *last* sent message's session?
          // This is tricky with WebSocket if multiple sessions are active?
          // But the UI only supports one active stream at a time.
          // So we can use a ref to store the `streamingSessionId`.
          if (streamingSessionIdRef.current) {
            handleWebSocketMessage(data, streamingSessionIdRef.current)
          }
        },
        onOpen: () => {
          isConnectedRef.current = true
        },
        onClose: () => {
          isConnectedRef.current = false
        },
        onError: (error) => {
          console.error('WebSocket connection failed')
          isConnectedRef.current = false
          setStreamingErrorMessage('WebSocket connection error')
        }
      })
    }
  }, [selectedEndpoint, authToken, connect, handleWebSocketMessage, setStreamingErrorMessage])

  const handleStreamResponse = useCallback(
    async (input: string | FormData, explicitSessionId?: string) => {
      // Use explicit session ID if provided (from previous fix) or current session
      // But we need to capture the session ID for this specific stream
      const currentSessionId = explicitSessionId || sessionId || crypto.randomUUID()
      // Ensure WebSocket is connected
      ensureConnection()

      // Wait for WebSocket to be ready (up to 5 seconds)
      let attempts = 0
      while (!isConnectedRef.current && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }

      if (!isConnectedRef.current) {
        updateMessagesWithErrorState()
        setStreamingErrorMessage('Failed to connect to WebSocket server')
        return
      }

      setIsStreaming(true)

      const message = input instanceof FormData
        ? (input.get('message') as string)
        : input

      // Remove previous error messages if retrying
      setMessages((prevMessages) => {
        if (prevMessages.length >= 2) {
          const lastMessage = prevMessages[prevMessages.length - 1]
          const secondLastMessage = prevMessages[prevMessages.length - 2]
          if (
            lastMessage.role === 'agent' &&
            lastMessage.streamingError &&
            secondLastMessage.role === 'user'
          ) {
            return prevMessages.slice(0, -2)
          }
        }
        return prevMessages
      })

      streamingSessionIdRef.current = currentSessionId
      if (!sessionId) {
        setSessionId(currentSessionId)
      }

      // Add user message
      addMessage({
        role: 'user',
        content: message,
        created_at: Math.floor(Date.now() / 1000)
      }, currentSessionId)

      // Add placeholder for agent response
      addMessage({
        role: 'agent',
        content: '',
        tool_calls: [],
        streamingError: false,
        created_at: Math.floor(Date.now() / 1000) + 1
      }, currentSessionId)

      // Send message via WebSocket
      const sent = sendMessage(message, {})

      if (!sent) {
        updateMessagesWithErrorState()
        setStreamingErrorMessage('Failed to send message. Please check connection.')
        setIsStreaming(false)
      }
    },
    [
      ensureConnection,
      setMessages,
      addMessage,
      sendMessage,
      setIsStreaming,
      setStreamingErrorMessage,
      updateMessagesWithErrorState
    ]
  )

  const disconnectWebSocket = useCallback(() => {
    disconnect()
    isConnectedRef.current = false
  }, [disconnect])

  // Connect on mount and when endpoint/token changes
  useEffect(() => {
    if (authToken !== undefined && !isTokenLoading) {
      ensureConnection()
    }
  }, [ensureConnection, authToken, isTokenLoading])

  return {
    handleStreamResponse,
    disconnectWebSocket,
    ensureConnection
  }
}

export default useWebSocketStreamHandler
