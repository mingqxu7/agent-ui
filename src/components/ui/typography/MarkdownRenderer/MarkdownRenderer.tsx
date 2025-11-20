import { type FC } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { useStickToBottomContext } from 'use-stick-to-bottom'

import { cn } from '@/lib/utils'
import { useStore } from '@/store'
import useWebSocketStreamHandler from '@/hooks/useWebSocketStreamHandler'
import useAIChatStreamHandler from '@/hooks/useAIStreamHandler'

import { type MarkdownRendererProps } from './types'

const MarkdownRenderer: FC<MarkdownRendererProps> = ({
  children,
  classname
}) => {
  const useWebSocket = useStore((state) => state.useWebSocket)
  const isStreaming = useStore((state) => state.isStreaming)
  const { handleStreamResponse: handleWsStreamResponse } = useWebSocketStreamHandler({ shouldAutoConnect: false })
  const { handleStreamResponse: handleHttpStreamResponse } = useAIChatStreamHandler()

  // Safe usage of stick-to-bottom context
  let scrollToBottom: (() => void) | undefined
  try {
    const context = useStickToBottomContext()
    scrollToBottom = context.scrollToBottom
  } catch (e) {
    // Context not found, ignore
  }

  // Select the appropriate handler based on mode
  const handleStreamResponse = useWebSocket ? handleWsStreamResponse : handleHttpStreamResponse

  // Ensure children is a string
  let content = typeof children === 'string' ? children : String(children || '')

  // Pre-process content to handle spaces in question:// links
  // Markdown breaks links with spaces, so we need to encode them
  content = content.replace(/\[([^\]]+)\]\((question:\/\/[^)]+)\)/g, (match, text, url) => {
    // Encode spaces in the URL part
    const encodedUrl = url.replace(/ /g, '%20')
    return `[${text}](${encodedUrl})`
  })


  // Custom link component that handles question:// protocol
  const LinkComponent = ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (href?.startsWith('question://')) {
      const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (isStreaming) return

        if (scrollToBottom) {
          scrollToBottom()
        }

        const question = decodeURIComponent(href.replace('question://', ''))

        // Directly submit the question using the stream handler
        try {
          await handleStreamResponse(question)
        } catch (error) {
          console.error('Error submitting question:', error)
        }
        return false
      }

      return (
        <span
          onClick={handleClick}
          className={cn(
            "text-primary underline",
            isStreaming ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:text-primary/80"
          )}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleClick(e as unknown as React.MouseEvent)
            }
          }}
          {...props}
        >
          {children}
        </span>
      )
    }

    // Regular link - open in new tab
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline hover:text-primary/80"
        {...props}
      >
        {children}
      </a>
    )
  }

  return (
    <ReactMarkdown
      className={cn(
        'prose prose-invert max-w-none text-secondary prose-headings:text-secondary prose-p:text-secondary prose-strong:font-bold prose-strong:text-secondary prose-a:text-primary prose-code:text-secondary prose-pre:bg-accent prose-pre:text-secondary',
        classname
      )}
      remarkPlugins={[remarkGfm, remarkBreaks]}
      urlTransform={(url) => {
        // Allow question:// protocol to pass through
        if (url.startsWith('question://')) {
          return url
        }
        // For all other URLs, use default behavior
        return url
      }}
      components={{
        a: LinkComponent,
        strong: ({ children }) => <strong className="font-bold text-secondary">{children}</strong>,
        em: ({ children }) => <em className="italic text-secondary">{children}</em>
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

export default MarkdownRenderer
