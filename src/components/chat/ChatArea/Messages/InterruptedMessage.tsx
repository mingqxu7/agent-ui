import Icon from '@/components/ui/icon'

interface InterruptedMessageProps {
  onRetry: () => void
}

const InterruptedMessage = ({ onRetry }: InterruptedMessageProps) => {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="h-5 w-5 text-yellow-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <p className="text-sm font-medium text-yellow-500">Connection Interrupted</p>
          <p className="text-xs text-muted-foreground">
            The response was interrupted because the connection was closed.
            This may have happened if you closed the browser or switched apps during streaming.
          </p>
        </div>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 rounded-md bg-yellow-500/20 px-3 py-2 text-sm font-medium text-yellow-500 hover:bg-yellow-500/30 transition-colors w-fit"
      >
        <Icon type="refresh" size="xs" />
        Retry this message
      </button>
    </div>
  )
}

export default InterruptedMessage
