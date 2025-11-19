import { useCallback, useRef, useEffect } from 'react'

interface WebSocketChatOptions {
  endpoint: string
  authToken?: string
  onMessage: (data: any) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Event) => void
}

export default function useWebSocketChat() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentUrlRef = useRef<string | null>(null)
  const onMessageRef = useRef<((data: any) => void) | null>(null)

  useEffect(() => {
    console.log('useWebSocketChat mounted')
    return () => console.log('useWebSocketChat unmounted')
  }, [])

  const connect = useCallback(
    ({ endpoint, authToken, onMessage, onOpen, onClose, onError }: WebSocketChatOptions) => {
      // Update the message handler ref
      onMessageRef.current = onMessage

      // Construct WebSocket URL
      // Convert http://localhost:9000 to ws://localhost:9000/chat
      if (!endpoint) {
        console.error('WebSocket endpoint is missing')
        return
      }

      const wsUrl = endpoint.replace(/^https?:\/\//, (match) =>
        match === 'https://' ? 'wss://' : 'ws://'
      )
      const fullWsUrl = authToken
        ? `${wsUrl}/chat?jwt=${authToken}`
        : `${wsUrl}/chat`

      console.log('Connecting to WebSocket:', fullWsUrl)

      // If already connected to the same URL, don't reconnect
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING) &&
        currentUrlRef.current === fullWsUrl
      ) {
        return
      }

      // Close existing connection if any
      if (wsRef.current) {
        console.log('Closing WebSocket connection (reconnecting or changing URL)')
        wsRef.current.close()
      }

      try {
        const ws = new WebSocket(fullWsUrl)
        wsRef.current = ws
        currentUrlRef.current = fullWsUrl

        ws.onopen = (event) => {
          console.log('WebSocket connected')
          if (onOpen) onOpen()
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (onMessageRef.current) {
              onMessageRef.current(data)
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        ws.onerror = (event) => {
          // WebSocket error events often don't contain specific details for security reasons
          console.error('WebSocket connection error. Check if the server is running and reachable.')
          if (onError) onError(event)
        }

        ws.onclose = (event) => {
          console.log('WebSocket closed')
          if (onClose) onClose()
        }
      } catch (error) {
        console.error('Error creating WebSocket:', error)
        if (onError) onError(error as Event)
      }
    },
    []
  )

  const sendMessage = useCallback((question: string, refData: Record<string, any> = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const query = JSON.stringify({
        question,
        ref_data: refData
      })
      wsRef.current.send(query)
      return true
    } else {
      console.error('WebSocket is not open')
      return false
    }
  }, [])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      console.log('Disconnecting WebSocket')
      wsRef.current.close()
      wsRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    currentUrlRef.current = null
  }, [])

  const reconnect = useCallback(
    (options: WebSocketChatOptions) => {
      disconnect()
      reconnectTimeoutRef.current = setTimeout(() => {
        connect(options)
      }, 1000)
    },
    [connect, disconnect]
  )

  const getReadyState = useCallback(() => {
    return wsRef.current?.readyState ?? WebSocket.CLOSED
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    connect,
    sendMessage,
    disconnect,
    reconnect,
    getReadyState,
    isOpen: () => wsRef.current?.readyState === WebSocket.OPEN,
    isConnecting: () => wsRef.current?.readyState === WebSocket.CONNECTING
  }
}
