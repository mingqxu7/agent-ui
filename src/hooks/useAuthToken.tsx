import { useEffect, useCallback, useRef, useState } from 'react'
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
  const [isLoading, setIsLoading] = useState(true)

  const fetchToken = useCallback(async () => {
    if (!selectedEndpoint) return

    // Avoid fetching from localhost if we are not on localhost (e.g. mobile)
    // The Sidebar component will update the endpoint shortly.
    if (
      selectedEndpoint.includes('localhost') &&
      typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      console.log('Skipping token fetch from localhost on non-localhost device')
      return
    }

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
    } finally {
      setIsLoading(false)
    }
  }, [selectedEndpoint, setAuthToken])

  // Fetch token on mount and when endpoint changes
  useEffect(() => {
    fetchToken()

    // Cleanup timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, [selectedEndpoint, fetchToken])

  // Manual refresh function
  const refreshToken = useCallback(() => {
    fetchToken()
  }, [fetchToken])

  // Validate token before use
  const validateToken = useCallback(() => {
    if (!authToken) {
      console.warn('No auth token available')
      return false
    }

    // Check if we have valid_until stored
    const tokenExpiresAt = useStore.getState().tokenExpiresAt
    if (tokenExpiresAt) {
      const now = Math.floor(Date.now() / 1000)
      const timeUntilExpiry = tokenExpiresAt - now

      if (timeUntilExpiry < 60) {
        // Token expires in less than 1 minute
        console.warn('Token expired or expiring very soon')
        return false
      }
    }

    return true
  }, [authToken])

  // Clear token on auth error
  const clearToken = useCallback(() => {
    console.log('Clearing auth token')
    setAuthToken('')
    useStore.getState().setTokenExpiresAt(null)

    // Clear refresh timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [setAuthToken])

  return {
    token: authToken,
    refreshToken,
    hasToken: !!authToken,
    isLoading,
    validateToken,
    clearToken
  }
}
