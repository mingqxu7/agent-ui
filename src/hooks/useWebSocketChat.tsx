import { useCallback, useEffect, useRef } from 'react'
import { webSocketService } from '@/lib/websocket-service'

interface WebSocketChatOptions {
  endpoint: string
  authToken?: string
  onMessage: (data: unknown) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Event) => void
}

export default function useWebSocketChat() {
  // We keep track of handlers to remove them on unmount
  const handlersRef = useRef<{
    onMessage: ((data: unknown) => void) | null
    onOpen: (() => void) | null
    onClose: (() => void) | null
    onError: ((error: Event) => void) | null
  }>({
    onMessage: null,
    onOpen: null,
    onClose: null,
    onError: null
  })

  useEffect(() => {
    console.log('useWebSocketChat mounted')
    const handlers = handlersRef.current
    return () => {
      console.log('useWebSocketChat unmounted')
      // Cleanup handlers on unmount
      if (handlers.onMessage) webSocketService.removeMessageHandler(handlers.onMessage)
      if (handlers.onOpen) webSocketService.removeOpenHandler(handlers.onOpen)
      if (handlers.onClose) webSocketService.removeCloseHandler(handlers.onClose)
      if (handlers.onError) webSocketService.removeErrorHandler(handlers.onError)
    }
  }, [])

  const connect = useCallback(
    async ({ endpoint, authToken, onMessage, onOpen, onClose, onError }: WebSocketChatOptions) => {
      // Remove old handlers if any
      if (handlersRef.current.onMessage) webSocketService.removeMessageHandler(handlersRef.current.onMessage)
      if (handlersRef.current.onOpen) webSocketService.removeOpenHandler(handlersRef.current.onOpen)
      if (handlersRef.current.onClose) webSocketService.removeCloseHandler(handlersRef.current.onClose)
      if (handlersRef.current.onError) webSocketService.removeErrorHandler(handlersRef.current.onError)

      // Register new handlers
      handlersRef.current.onMessage = onMessage
      handlersRef.current.onOpen = onOpen || null
      handlersRef.current.onClose = onClose || null
      handlersRef.current.onError = onError || null

      webSocketService.addMessageHandler(onMessage)
      if (onOpen) webSocketService.addOpenHandler(onOpen)
      if (onClose) webSocketService.addCloseHandler(onClose)
      if (onError) webSocketService.addErrorHandler(onError)

      if (!endpoint) {
        console.error('WebSocket endpoint is missing')
        return
      }

      try {
        await webSocketService.connect(endpoint, authToken)
      } catch (error) {
        console.error('Error connecting to WebSocket:', error)
        if (onError) onError(error as Event)
      }
    },
    []
  )

  const sendMessage = useCallback(async (question: string, refData: Record<string, unknown> = {}) => {
    return await webSocketService.sendMessage(question, refData)
  }, [])

  const disconnect = useCallback(() => {
    webSocketService.disconnect()
  }, [])

  const reconnect = useCallback(
    (options: WebSocketChatOptions) => {
      disconnect()
      setTimeout(() => {
        connect(options)
      }, 1000)
    },
    [connect, disconnect]
  )

  const getReadyState = useCallback(() => {
    return webSocketService.isConnected() ? WebSocket.OPEN : WebSocket.CLOSED
  }, [])

  return {
    connect,
    sendMessage,
    disconnect,
    reconnect,
    getReadyState,
    isOpen: () => webSocketService.isConnected(),
    isConnecting: () => webSocketService.isConnecting()
  }
}
