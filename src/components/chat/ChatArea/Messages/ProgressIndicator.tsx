interface ProgressIndicatorProps {
  message: string
}

const ProgressIndicator = ({ message }: ProgressIndicatorProps) => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <div className="flex items-center justify-center gap-1">
      <div className="size-1.5 animate-bounce rounded-full bg-primary/40 [animation-delay:-0.3s] [animation-duration:0.70s]" />
      <div className="size-1.5 animate-bounce rounded-full bg-primary/40 [animation-delay:-0.10s] [animation-duration:0.70s]" />
      <div className="size-1.5 animate-bounce rounded-full bg-primary/40 [animation-duration:0.70s]" />
    </div>
    <span>{message}</span>
  </div>
)

export default ProgressIndicator
