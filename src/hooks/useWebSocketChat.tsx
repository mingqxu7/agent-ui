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

  const connect = useCallback(
    ({ endpoint, authToken, onMessage, onOpen, onClose, onError }: WebSocketChatOptions) => {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close()
      }

      // Construct WebSocket URL
      // Convert http://localhost:9000 to ws://localhost:9000/chat
      const wsUrl = endpoint.replace(/^https?:\/\//, (match) =>
        match === 'https://' ? 'wss://' : 'ws://'
      )
      const fullWsUrl = authToken
        ? `${wsUrl}/chat?jwt=${authToken}`
        : `${wsUrl}/chat`

      try {
        const ws = new WebSocket(fullWsUrl)
        wsRef.current = ws

        ws.onopen = (event) => {
          console.log('WebSocket connected')
          if (onOpen) onOpen()
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            onMessage(data)
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        ws.onerror = (event) => {
          console.error('WebSocket error:', event)
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
      wsRef.current.close()
      wsRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
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
