/**
 * HTTP Streaming Service for chat-sop backend
 * Handles Server-Sent Events (SSE) streaming for the new POST /chat endpoint
 */

// Custom error classes
export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export class SessionNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SessionNotFoundError'
  }
}

export class LegacySessionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LegacySessionError'
  }
}

// SSE Message types based on chat-sop backend
export interface SSEMessage {
  type: 'connected' | 'start' | 'stream' | 'info' | 'end' | 'error'
  sender?: 'bot' | 'user'
  message?: string
  session_id?: string
  error?: string
  [key: string]: unknown // Allow additional fields
}

// Request format for POST /chat
export interface ChatStreamRequest {
  message: string
  session_id?: string
  belief_system?: string
  style?: string
  scenario_id?: number
  language?: string
  ref_question?: string
}

class HTTPStreamService {
  private abortController: AbortController | null = null

  /**
   * Start streaming from the HTTP endpoint
   */
  async startStream(
    endpoint: string,
    request: ChatStreamRequest,
    authToken: string,
    onMessage?: (data: SSEMessage) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void
  ): Promise<void> {
    // Validate token
    if (!authToken) {
      throw new AuthError('No auth token available')
    }

    // Create new abort controller for this stream
    this.abortController = new AbortController()

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(request),
        signal: this.abortController.signal
      })

      // Handle auth errors
      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}))
        throw new AuthError(errorData.detail || 'Authentication failed')
      }

      // Handle other HTTP errors
      if (!response.ok) {
        if (response.status === 404) {
          throw new SessionNotFoundError('Session not found')
        }
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}))
          if (
            errorData.detail?.includes('metadata') ||
            errorData.detail?.includes('legacy')
          ) {
            throw new LegacySessionError(
              errorData.detail || 'Legacy session format'
            )
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Check if response is actually a stream
      if (!response.body) {
        throw new Error('No response body')
      }

      // Parse SSE stream
      await this.parseSSEStream(response.body, onMessage, onError)

      // Stream completed successfully
      onComplete?.()
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Stream aborted by user')
        return
      }
      onError?.(error as Error)
      throw error
    }
  }

  /**
   * Parse Server-Sent Events stream
   */
  private async parseSSEStream(
    body: ReadableStream<Uint8Array>,
    onMessage?: (data: SSEMessage) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true })

        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          // SSE format: "data: {JSON}\n\n"
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim() // Remove "data: " prefix

            if (!jsonStr) continue

            try {
              const data = JSON.parse(jsonStr) as SSEMessage
              onMessage?.(data)
            } catch (parseError) {
              console.error('Failed to parse SSE message:', parseError, jsonStr)
              onError?.(
                new Error(`Failed to parse message: ${parseError}`)
              )
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Abort the current stream
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  /**
   * Check if currently streaming
   */
  isStreaming(): boolean {
    return this.abortController !== null
  }
}

// Export singleton instance
export const httpStreamService = new HTTPStreamService()
