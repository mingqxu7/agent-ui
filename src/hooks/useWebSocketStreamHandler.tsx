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
  const [, setSessionId] = useQueryState('session')
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const setStreamingErrorMessage = useStore(
    (state) => state.setStreamingErrorMessage
  )
  const setIsStreaming = useStore((state) => state.setIsStreaming)
  const { connect, sendMessage, disconnect } = useWebSocketChat()

  // Use the auto-fetching token hook
  const { token: authToken } = useAuthToken()

  const isConnectedRef = useRef(false)
  const currentResponseRef = useRef('')

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
    (data: WebSocketMessage) => {
      if (data.sender === 'bot') {
        if (data.type === 'start') {
          // Bot is starting to respond
          currentResponseRef.current = ''
          setIsStreaming(true)
        } else if (data.type === 'stream') {
          // Streaming content
          currentResponseRef.current += data.message
          setMessages((prevMessages) => {
            const newMessages = [...prevMessages]
            const lastMessage = newMessages[newMessages.length - 1]
            if (lastMessage && lastMessage.role === 'agent') {
              lastMessage.content = currentResponseRef.current
            }
            return newMessages
          })
        } else if (data.type === 'info') {
          // Info message (could be shown in UI header/status)
          console.log('Info:', data.message)
        } else if (data.type === 'end') {
          // Response complete
          currentResponseRef.current += data.message
          setMessages((prevMessages) => {
            const newMessages = [...prevMessages]
            const lastMessage = newMessages[newMessages.length - 1]
            if (lastMessage && lastMessage.role === 'agent') {
              lastMessage.content = currentResponseRef.current
            }
            return newMessages
          })
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
      updateMessagesWithErrorState
    ]
  )

  const ensureConnection = useCallback(() => {
    if (!isConnectedRef.current) {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)

      connect({
        endpoint: endpointUrl,
        authToken,
        onMessage: handleWebSocketMessage,
        onOpen: () => {
          isConnectedRef.current = true
        },
        onClose: () => {
          isConnectedRef.current = false
        },
        onError: (error) => {
          console.error('WebSocket error:', error)
          isConnectedRef.current = false
          setStreamingErrorMessage('WebSocket connection error')
        }
      })
    }
  }, [selectedEndpoint, authToken, connect, handleWebSocketMessage, setStreamingErrorMessage])

  const handleStreamResponse = useCallback(
    async (input: string | FormData) => {
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

      // Add user message
      addMessage({
        role: 'user',
        content: message,
        created_at: Math.floor(Date.now() / 1000)
      })

      // Add placeholder for agent response
      addMessage({
        role: 'agent',
        content: '',
        tool_calls: [],
        streamingError: false,
        created_at: Math.floor(Date.now() / 1000) + 1
      })

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
    if (authToken !== undefined) {
      ensureConnection()
    }
  }, [ensureConnection, authToken])

  return {
    handleStreamResponse,
    disconnectWebSocket,
    ensureConnection
  }
}

export default useWebSocketStreamHandler
