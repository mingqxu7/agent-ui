
type MessageHandler = (data: unknown) => void
type ConnectionHandler = () => void
type ErrorHandler = (error: Event) => void

interface WebSocketListeners {
    onMessage: Set<MessageHandler>
    onOpen: Set<ConnectionHandler>
    onClose: Set<ConnectionHandler>
    onError: Set<ErrorHandler>
}

class WebSocketService {
    private ws: WebSocket | null = null
    private url: string | null = null
    private listeners: WebSocketListeners = {
        onMessage: new Set(),
        onOpen: new Set(),
        onClose: new Set(),
        onError: new Set()
    }
    private connectionPromise: Promise<void> | null = null
    private reconnectTimeout: NodeJS.Timeout | null = null

    public isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN
    }

    public isConnecting(): boolean {
        return this.ws?.readyState === WebSocket.CONNECTING || this.connectionPromise !== null
    }

    public async connect(url: string, token?: string): Promise<void> {
        // If already connected to the same URL, do nothing
        const fullUrl = this.constructUrl(url, token)
        if (this.isConnected() && this.url === fullUrl) {
            return
        }

        // If a connection attempt is already in progress for the same URL, return that promise
        if (this.connectionPromise && this.url === fullUrl) {
            return this.connectionPromise
        }

        // Close existing connection if URL changed
        if (this.ws) {
            this.disconnect()
        }

        this.url = fullUrl
        this.connectionPromise = new Promise((resolve, reject) => {
            try {
                console.log('WebSocketService: Connecting to', fullUrl)
                this.ws = new WebSocket(fullUrl)

                this.ws.onopen = () => {
                    console.log('WebSocketService: Connected')
                    this.connectionPromise = null
                    this.notifyListeners('onOpen')
                    resolve()
                }

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data)
                        this.notifyListeners('onMessage', data)
                    } catch (error) {
                        console.error('WebSocketService: Error parsing message', error)
                    }
                }

                this.ws.onerror = (event) => {
                    console.error('WebSocketService: Connection error', event)
                    this.connectionPromise = null
                    this.notifyListeners('onError', event)
                    reject(event)
                }

                this.ws.onclose = () => {
                    console.log('WebSocketService: Closed')
                    this.connectionPromise = null
                    this.ws = null
                    this.notifyListeners('onClose')
                }
            } catch (error) {
                this.connectionPromise = null
                reject(error)
            }
        })

        return this.connectionPromise
    }

    public disconnect() {
        if (this.ws) {
            this.ws.close()
            this.ws = null
        }
        this.url = null
        this.connectionPromise = null
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout)
            this.reconnectTimeout = null
        }
    }

    public async sendMessage(message: string, refData: Record<string, unknown> = {}): Promise<boolean> {
        const payload = JSON.stringify({
            question: message,
            ref_data: refData
        })

        try {
            if (this.isConnected() && this.ws) {
                this.ws.send(payload)
                return true
            }

            // If not connected, try to reconnect
            console.log('WebSocketService: Not connected, attempting to reconnect...')
            if (this.url) {
                await this.connect(this.url.split('?')[0], this.getTokenFromUrl(this.url))
                if (this.ws && this.isConnected()) {
                    this.ws.send(payload)
                    return true
                }
            }
        } catch (error) {
            console.error('WebSocketService: Failed to send message', error)
            // Retry logic could go here, but simple reconnection attempt above covers most cases
        }

        return false
    }

    public addMessageHandler(handler: MessageHandler) {
        this.listeners.onMessage.add(handler)
    }

    public removeMessageHandler(handler: MessageHandler) {
        this.listeners.onMessage.delete(handler)
    }

    public addOpenHandler(handler: ConnectionHandler) {
        this.listeners.onOpen.add(handler)
    }

    public removeOpenHandler(handler: ConnectionHandler) {
        this.listeners.onOpen.delete(handler)
    }

    public addCloseHandler(handler: ConnectionHandler) {
        this.listeners.onClose.add(handler)
    }

    public removeCloseHandler(handler: ConnectionHandler) {
        this.listeners.onClose.delete(handler)
    }

    public addErrorHandler(handler: ErrorHandler) {
        this.listeners.onError.add(handler)
    }

    public removeErrorHandler(handler: ErrorHandler) {
        this.listeners.onError.delete(handler)
    }

    private notifyListeners(type: keyof WebSocketListeners, data?: unknown) {
        this.listeners[type].forEach((handler) => {
            try {
                (handler as (data?: unknown) => void)(data)
            } catch (error) {
                console.error(`WebSocketService: Error in ${type} listener`, error)
            }
        })
    }

    private constructUrl(endpoint: string, token?: string): string {
        const wsUrl = endpoint.replace(/^https?:\/\//, (match) =>
            match === 'https://' ? 'wss://' : 'ws://'
        )
        // Check if endpoint already has /chat path
        const baseUrl = wsUrl.endsWith('/chat') ? wsUrl : `${wsUrl}/chat`
        return token ? `${baseUrl}?jwt=${token}` : baseUrl
    }

    private getTokenFromUrl(url: string): string | undefined {
        const match = url.match(/jwt=([^&]*)/)
        return match ? match[1] : undefined
    }
}

export const webSocketService = new WebSocketService()
