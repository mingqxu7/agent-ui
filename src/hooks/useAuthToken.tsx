import { useEffect, useCallback, useRef } from 'react'
import { useStore } from '@/store'
import { getTokenAPI } from '@/api/os'
import { constructEndpointUrl } from '@/lib/constructEndpointUrl'

/**
 * Hook to automatically fetch and manage auth token from /api/token endpoint
 * Handles:
 * - Initial token fetch on mount
 * - Automatic token refresh before expiration
 * - Token storage in global state
 */
export default function useAuthToken() {
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)
  const setAuthToken = useStore((state) => state.setAuthToken)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchToken = useCallback(async () => {
    if (!selectedEndpoint) return

    try {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)
      const { token, valid_until } = await getTokenAPI(endpointUrl)

      if (token) {
        setAuthToken(token)

        // Schedule refresh 5 minutes before expiration
        if (valid_until) {
          const now = Math.floor(Date.now() / 1000)
          const timeUntilExpiry = valid_until - now
          const refreshIn = Math.max((timeUntilExpiry - 300) * 1000, 60000) // Refresh 5 min early, or at least in 1 min

          // Clear existing timer
          if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current)
          }

          // Set new refresh timer
          refreshTimerRef.current = setTimeout(() => {
            console.log('Token expiring soon, refreshing...')
            fetchToken()
          }, refreshIn)

          console.log(`Token will be refreshed in ${Math.floor(refreshIn / 1000)} seconds`)
        }
      } else {
        // No token required (auth not enabled on backend)
        setAuthToken('')
      }
    } catch (error) {
      console.error('Failed to fetch auth token:', error)
    }
  }, [selectedEndpoint, setAuthToken])

  // Fetch token on mount and when endpoint changes
  useEffect(() => {
    // Only auto-fetch if no token is set
    if (!authToken) {
      fetchToken()
    }

    // Cleanup timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, [selectedEndpoint, fetchToken, authToken])

  // Manual refresh function
  const refreshToken = useCallback(() => {
    fetchToken()
  }, [fetchToken])

  return {
    token: authToken,
    refreshToken,
    hasToken: !!authToken
  }
}
