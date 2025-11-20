import Icon from '@/components/ui/icon'
import MarkdownRenderer from '@/components/ui/typography/MarkdownRenderer'
import { useStore } from '@/store'
import type { ChatMessage } from '@/types/os'
import Videos from './Multimedia/Videos'
import Images from './Multimedia/Images'
import Audios from './Multimedia/Audios'
import AgentThinkingLoader from './AgentThinkingLoader'
import ProgressIndicator from './ProgressIndicator'

interface MessageProps {
  message: ChatMessage
  onDelete?: () => void
  isLastMessage?: boolean
}

import { memo, useState } from 'react'

const MessageActions = ({ content, onDelete }: { content: string; onDelete?: () => void }) => {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = async () => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard API not available, falling back to legacy copy')
      const textArea = document.createElement('textarea')
      textArea.value = content
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      textArea.style.top = '0'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        document.execCommand('copy')
      } catch (err) {
        console.error('Fallback copy failed', err)
      }
      document.body.removeChild(textArea)
      return
    }
    try {
      await navigator.clipboard.writeText(content)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  return (
    <div className="flex items-center gap-2 opacity-100 transition-opacity">
      <button
        onClick={handleCopy}
        className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
        title="Copy message"
      >
        {isCopied ? <Icon type="check" size="xs" /> : <Icon type="copy" size="xs" />}
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          className="rounded p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          title="Delete message"
        >
          <Icon type="trash" size="xs" />
        </button>
      )}
    </div>
  )
}

const AgentMessage = ({ message, onDelete, isLastMessage }: MessageProps) => {
  const { streamingErrorMessage, isStreaming } = useStore()
  let messageContent
  if (message.streamingError) {
    messageContent = (
      <p className="text-destructive">
        Oops! Something went wrong while streaming.{' '}
        {streamingErrorMessage ? (
          <>{streamingErrorMessage}</>
        ) : (
          'Please try refreshing the page or try again later.'
        )}
      </p>
    )
  } else if (message.content) {
    messageContent = (
      <div className="flex w-full flex-col gap-4">
        <MarkdownRenderer>{message.content}</MarkdownRenderer>
        {message.videos && message.videos.length > 0 && (
          <Videos videos={message.videos} />
        )}
        {message.images && message.images.length > 0 && (
          <Images images={message.images} />
        )}
        {message.audio && message.audio.length > 0 && (
          <Audios audio={message.audio} />
        )}
        {message.progressStatus && (
          <ProgressIndicator message={message.progressStatus} />
        )}
      </div>
    )
  } else if (message.response_audio) {
    if (!message.response_audio.transcript) {
      messageContent = (
        <div className="mt-2 flex items-start">
          <AgentThinkingLoader />
        </div>
      )
    } else {
      messageContent = (
        <div className="flex w-full flex-col gap-4">
          <MarkdownRenderer>
            {message.response_audio.transcript}
          </MarkdownRenderer>
          {message.response_audio.content && message.response_audio && (
            <Audios audio={[message.response_audio]} />
          )}
        </div>
      )
    }
  } else {
    messageContent = (
      <div className="mt-2 flex flex-col gap-3">
        {message.progressStatus ? (
          <ProgressIndicator message={message.progressStatus} />
        ) : (
          <AgentThinkingLoader />
        )}
      </div>
    )
  }

  return (
    <div className="group/message flex flex-row items-start gap-4 font-geist">
      <div className="flex-shrink-0">
        <Icon type="agent" size="sm" />
      </div>
      <div className="flex w-full flex-col gap-2">
        {messageContent}
        <div className="flex justify-end">
          {!isStreaming || !isLastMessage ? (
            <MessageActions
              content={message.content || message.response_audio?.transcript || ''}
              onDelete={onDelete}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

const UserMessage = memo(({ message }: MessageProps) => {
  return (
    <div className="group/message flex items-start gap-4 pt-4 text-start max-md:break-words">
      <div className="flex-shrink-0">
        <Icon type="user" size="sm" />
      </div>
      <div className="flex w-full flex-col gap-2">
        <div className="text-md rounded-lg font-geist text-secondary">
          {message.content}
        </div>
      </div>
    </div>
  )
})

AgentMessage.displayName = 'AgentMessage'
UserMessage.displayName = 'UserMessage'
export { AgentMessage, UserMessage }
