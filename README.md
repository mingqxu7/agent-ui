# Agent UI

A modern chat interface for AgentOS built with Next.js, Tailwind CSS, and TypeScript. This template provides a ready-to-use UI for connecting to and interacting with your AgentOS instances with support for both HTTP and WebSocket connections.

<img src="https://agno-public.s3.us-east-1.amazonaws.com/assets/agent_ui_banner.svg" alt="agent-ui" style="border-radius: 10px; width: 100%; max-width: 800px;" />

## Features

- 🔗 **AgentOS Integration**: Seamlessly connect to local and live AgentOS instances
- 🔌 **Dual Connection Modes**: Support for both HTTP and WebSocket connections
- 🔐 **Authentication Support**: Automatic token management with refresh capabilities
- 💬 **Modern Chat Interface**: Clean design with real-time streaming support
- 🧩 **Tool Calls Support**: Visualizes agent tool calls and their results
- 🧠 **Reasoning Steps**: Displays agent reasoning process (when available)
- 📚 **References Support**: Show sources used by the agent
- 🖼️ **Multi-modality Support**: Handles various content types including images, video, and audio
- 🎨 **Customizable UI**: Built with Tailwind CSS for easy styling
- 🧰 **Built with Modern Stack**: Next.js, TypeScript, shadcn/ui, Framer Motion, and more

## Connection Modes

This UI supports two connection modes:

- **WebSocket Mode** (Default): Real-time bidirectional communication with automatic reconnection and token refresh
- **HTTP Mode**: Traditional REST API with streaming support for agent/team interactions

## Getting Started

### Prerequisites

Before setting up Agent UI, you need a running AgentOS instance. The UI supports connecting to any compatible backend server.

> **Note**: Make sure your backend server is running before attempting to connect.

### Installation

1. Clone the repository:

```bash
git clone https://github.com/mingqxu7/agent-ui.git
cd agent-ui
```

2. Install dependencies:

```bash
pnpm install
```

3. Start the development server:

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Connecting to Your Backend

Agent UI connects directly to your backend instance, allowing you to interact with your agents through a modern chat interface.

> **Prerequisites**: You need a running backend server instance before you can connect Agent UI to it.

## Step-by-Step Connection Process

### 1. Configure the Endpoint

By default, Agent UI connects to `http://localhost:9000`. You can easily change this by:

1. Hovering over the endpoint URL in the left sidebar
2. Clicking the edit option to modify the connection settings

### 2. Choose Your Connection Mode

The UI supports two connection modes that persist in your browser:

- **WebSocket Mode** (Default): For real-time bidirectional communication
  - Automatic reconnection on connection loss
  - Automatic token refresh
  - Lower latency for interactive conversations

- **HTTP Mode**: For traditional REST API interactions
  - Agent and team selection required
  - Event-stream based responses
  - Compatible with standard HTTP endpoints

You can toggle between modes in the sidebar settings.

### 3. Choose Your Environment

- **Local Development**: Use `http://localhost:9000` (default) or your custom local port
- **Production**: Enter your production backend HTTPS URL

> **Warning**: Make sure your backend server is actually running on the specified endpoint before attempting to connect.

### 4. Configure Authentication

Authentication is handled automatically in WebSocket mode:

#### WebSocket Mode (Automatic)

- Tokens are automatically fetched from the `/api/token` endpoint
- Automatic refresh before expiration
- Stored in browser localStorage
- No manual configuration needed

#### HTTP Mode (Manual)

You can configure authentication tokens in two ways:

**Option 1: Environment Variable**

Set the `OS_SECURITY_KEY` environment variable:

```bash
# In your .env.local file
NEXT_PUBLIC_OS_SECURITY_KEY=your_auth_token_here
```

**Option 2: UI Configuration**

1. In the left sidebar, locate the "Auth Token" section
2. Click on the token field to edit it
3. Enter your authentication token
4. The token will be stored and included in all API requests

> **Security Note**: Authentication tokens are stored locally and included as Bearer tokens in API requests.

### 5. Test the Connection

Once you've configured the endpoint:

1. The Agent UI will automatically attempt to connect to your backend
2. Check the connection status indicator in the sidebar (green = connected)
3. In WebSocket mode, you can start chatting immediately
4. In HTTP mode, select an agent or team before chatting

## Deployment

### Deploy to Vercel

The easiest way to deploy Agent UI is using Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmingqxu7%2Fagent-ui)

**Quick Deploy Steps:**

1. Click the "Deploy with Vercel" button above (or visit [vercel.com/new](https://vercel.com/new))
2. Import your Git repository
3. Select `agent-ui` as the root directory (if in a monorepo)
4. Configure environment variables (optional):
   - `NEXT_PUBLIC_OS_SECURITY_KEY` - Default authentication token
   - `NEXT_PUBLIC_AGENTOS_URL` - Default backend URL
5. Click "Deploy"

**Important Notes:**
- Your backend must be accessible from the internet
- Configure CORS on your backend to allow your Vercel domain
- WebSocket connections require wss:// (secure WebSocket over HTTPS)

For detailed deployment instructions, see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md).

### Other Deployment Options

Agent UI is a standard Next.js application and can be deployed to:
- Netlify
- Railway
- Cloudflare Pages
- Docker
- Any platform supporting Next.js 15

## Documentation

- **[SETUP.md](./SETUP.md)**: Detailed setup instructions and configuration guide
- **[WEBSOCKET_INTEGRATION.md](./WEBSOCKET_INTEGRATION.md)**: WebSocket implementation details and architecture
- **[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)**: Complete guide for deploying to Vercel
- **[CLAUDE.md](./CLAUDE.md)**: Developer guide for working with this codebase

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is licensed under the [MIT License](./LICENSE).
