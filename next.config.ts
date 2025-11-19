import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  devIndicators: false,
  // Enable React strict mode for better error detection
  reactStrictMode: true,
  // Optimize for production
  poweredByHeader: false,
  // Disable source maps in production for security
  productionBrowserSourceMaps: false
}

export default nextConfig
