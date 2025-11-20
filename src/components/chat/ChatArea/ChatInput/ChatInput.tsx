'use client'
import { useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { TextArea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import useAIChatStreamHandler from '@/hooks/useAIStreamHandler'
import useWebSocketStreamHandler from '@/hooks/useWebSocketStreamHandler'
import { useQueryState } from 'nuqs'
import Icon from '@/components/ui/icon'

const ChatInput = () => {
  const { chatInputRef, useWebSocket, isEndpointActive, inputMessage, setInputMessage, setSubmitMessage, setRetryMessage } = useStore()

  const { handleStreamResponse: handleHttpStreamResponse } = useAIChatStreamHandler()
  const { handleStreamResponse: handleWsStreamResponse } = useWebSocketStreamHandler({ shouldAutoConnect: true })
  const [selectedAgent] = useQueryState('agent')
  const [teamId] = useQueryState('team')
  const isStreaming = useStore((state) => state.isStreaming)

  // Select the appropriate handler based on mode
  const handleStreamResponse = useWebSocket ? handleWsStreamResponse : handleHttpStreamResponse

  // In WebSocket mode, we don't need agent/team selection
  const canChat = useWebSocket ? isEndpointActive : (selectedAgent || teamId)

  const handleSubmit = useCallback(async () => {
    if (!inputMessage.trim()) return

    const currentMessage = inputMessage
    setInputMessage('')

    try {
      await handleStreamResponse(currentMessage)
    } catch (error) {
      toast.error(
        `Error in handleSubmit: ${error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }, [inputMessage, setInputMessage, handleStreamResponse])

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
    <div className="relative mx-auto mb-1 flex w-full max-w-2xl items-end justify-center gap-x-2 font-geist">
      <TextArea
        placeholder={'Ask anything'}
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
        disabled={!canChat}
        ref={chatInputRef}
      />
      <Button
        onClick={handleSubmit}
        disabled={!canChat || !inputMessage.trim() || isStreaming}
        size="icon"
        className="rounded-xl bg-primary p-5 text-primaryAccent"
      >
        <Icon type="send" color="primaryAccent" />
      </Button>
    </div>
  )
}

export default ChatInput
