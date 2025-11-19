# Deploying Agent UI to Vercel

This guide explains how to deploy the Agent UI to Vercel for production use.

## Prerequisites

- A Vercel account (sign up at [vercel.com](https://vercel.com))
- Git repository (GitHub, GitLab, or Bitbucket)
- A running backend server accessible from the internet (for production use)

## Deployment Options

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to a Git repository** (if not already done)

2. **Import the project to Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Select "Import Git Repository"
   - Choose your repository
   - Select the `agent-ui` directory as the root directory (if it's a monorepo)

3. **Configure the project:**
   - **Framework Preset:** Next.js (auto-detected)
   - **Build Command:** `pnpm build` (auto-detected from vercel.json)
   - **Output Directory:** `.next` (auto-detected)
   - **Install Command:** `pnpm install` (auto-detected from vercel.json)
   - **Root Directory:** `agent-ui` (if deploying from a monorepo)

4. **Set Environment Variables (Optional):**
   - Click "Environment Variables"
   - Add any required variables:
     - `NEXT_PUBLIC_OS_SECURITY_KEY` - Default auth token (if backend requires auth)
     - `NEXT_PUBLIC_AGENTOS_URL` - Default backend URL (e.g., `https://your-backend.com`)

5. **Deploy:**
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at `https://your-project.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy from the agent-ui directory:**
   ```bash
   cd agent-ui
   vercel
   ```

4. **Follow the prompts:**
   - Set up and deploy? `Y`
   - Which scope? Select your account/team
   - Link to existing project? `N` (first time) or `Y` (subsequent deploys)
   - What's your project's name? `agent-ui` (or your preferred name)
   - In which directory is your code located? `./`

5. **Set environment variables (optional):**
   ```bash
   vercel env add NEXT_PUBLIC_OS_SECURITY_KEY
   vercel env add NEXT_PUBLIC_AGENTOS_URL
   ```

6. **Deploy to production:**
   ```bash
   vercel --prod
   ```

## Configuration

### Environment Variables

Agent UI supports the following environment variables:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_OS_SECURITY_KEY` | Default authentication token for backend | No | - |
| `NEXT_PUBLIC_AGENTOS_URL` | Default backend endpoint URL | No | `http://localhost:9000` |

**Note:** All environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

### Setting Environment Variables in Vercel

**Via Dashboard:**
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add your variables for Production, Preview, and Development environments

**Via CLI:**
```bash
# Add a production environment variable
vercel env add NEXT_PUBLIC_AGENTOS_URL production

# Add for all environments
vercel env add NEXT_PUBLIC_OS_SECURITY_KEY
```

## Backend Considerations

### CORS Configuration

Your backend must allow requests from your Vercel domain. Update your backend's CORS settings:

**Python (FastAPI example):**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-project.vercel.app",
        "https://*.vercel.app",  # For preview deployments
        "http://localhost:3000"  # For local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### WebSocket Support

If using WebSocket mode, ensure:
1. Your backend supports WebSocket connections over HTTPS (wss://)
2. Your backend is accessible from the internet
3. WebSocket endpoints are not blocked by firewalls

### Backend URL Configuration

Users can configure the backend endpoint in two ways:

1. **Environment Variable (Default):**
   - Set `NEXT_PUBLIC_AGENTOS_URL` in Vercel
   - This becomes the default endpoint in the UI

2. **User Configuration (Runtime):**
   - Users can change the endpoint in the UI sidebar
   - This setting is saved to localStorage and persists across sessions

## Domain Configuration

### Custom Domain

1. **Add a custom domain:**
   - Go to your project settings
   - Navigate to "Domains"
   - Add your custom domain (e.g., `chat.yourdomain.com`)
   - Follow Vercel's DNS configuration instructions

2. **Update backend CORS:**
   - Add your custom domain to the backend's allowed origins

### Preview Deployments

Vercel automatically creates preview deployments for:
- Pull requests
- Branch pushes

Each preview gets a unique URL like `https://agent-ui-git-branch-name-your-team.vercel.app`

## Automatic Deployments

Vercel automatically deploys when you:
- Push to the main branch → Production deployment
- Push to other branches → Preview deployment
- Open a pull request → Preview deployment with comment

## Build Optimization

The project is already optimized for Vercel with:
- Next.js 15 App Router (automatic code splitting)
- Static asset optimization
- Image optimization (if using next/image)
- Automatic caching headers

## Monitoring and Logs

### View Deployment Logs

**Via Dashboard:**
1. Go to your project
2. Click on a deployment
3. View build logs and runtime logs

**Via CLI:**
```bash
vercel logs
```

### Analytics

Enable Vercel Analytics for traffic insights:
1. Go to project settings
2. Navigate to "Analytics"
3. Enable analytics
4. Add `@vercel/analytics` to your project (optional for more features)

## Troubleshooting

### Build Fails

**Issue:** Build fails with "pnpm not found"
- **Solution:** Vercel should auto-detect pnpm from package.json. Ensure `vercel.json` specifies `"installCommand": "pnpm install"`

**Issue:** TypeScript errors during build
- **Solution:** Run `pnpm typecheck` locally to catch errors before deploying

**Issue:** Environment variables not working
- **Solution:** Ensure variables are prefixed with `NEXT_PUBLIC_` and redeploy after adding them

### Runtime Issues

**Issue:** Cannot connect to backend
- **Solution:**
  - Check backend URL is correct
  - Verify backend CORS settings allow your Vercel domain
  - Ensure backend is accessible from the internet

**Issue:** WebSocket connection fails
- **Solution:**
  - Verify backend supports wss:// (WebSocket over HTTPS)
  - Check firewall rules allow WebSocket connections
  - Ensure backend WebSocket endpoint is accessible

**Issue:** 404 on refresh
- **Solution:** This should not happen with Next.js, but verify your `vercel.json` rewrites are correct

### Performance Issues

**Issue:** Slow initial load
- **Solution:**
  - Enable Vercel Edge Network (automatic)
  - Check bundle size with `pnpm build` and analyze
  - Consider code splitting or lazy loading heavy components

## Security Best Practices

1. **Never commit secrets:**
   - Use environment variables for sensitive data
   - Keep `.env.local` in `.gitignore`

2. **HTTPS only:**
   - Vercel provides automatic HTTPS
   - Never downgrade to HTTP in production

3. **Content Security Policy:**
   - The `vercel.json` includes basic security headers
   - Consider adding CSP headers for additional protection

4. **Authentication:**
   - Store auth tokens securely (app already uses localStorage)
   - Use HTTPS to prevent token interception
   - Consider implementing token refresh logic

## Cost Considerations

Vercel's free tier (Hobby) includes:
- 100GB bandwidth per month
- Unlimited deployments
- Automatic HTTPS
- Preview deployments

For production or team use, consider [Vercel Pro or Enterprise plans](https://vercel.com/pricing).

## Next Steps

After deployment:

1. **Test your deployment:**
   - Verify the UI loads correctly
   - Test backend connectivity
   - Test WebSocket connections (if applicable)
   - Test authentication flow

2. **Configure your backend:**
   - Update CORS settings
   - Test API endpoints
   - Verify token generation works

3. **Set up monitoring:**
   - Enable Vercel Analytics
   - Set up error tracking (e.g., Sentry)
   - Monitor backend logs

4. **Share with users:**
   - Provide the Vercel URL or custom domain
   - Document any required configuration
   - Provide backend endpoint information

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
