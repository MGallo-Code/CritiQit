'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { AuthChangeEvent } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { mapAuthUserToProfile, type UserProfile } from '@/lib/auth/user'

// Structure passed to components
interface CurrentUserContextValue {
  user: UserProfile | null
  isLoading: boolean
  refreshUser: () => Promise<void>
}

interface CurrentUserProviderProps {
  children: ReactNode
  initialUser?: UserProfile | null
}

// Create channel for data to be passed to components
const CurrentUserContext = createContext<CurrentUserContextValue | undefined>(undefined)

// Main component, wraps components receiving the data
export const CurrentUserProvider = ({
  children,
  initialUser = null,
}: CurrentUserProviderProps) => {
  // State of the data/component
  const [state, setState] = useState<CurrentUserContextValue>(() => ({
    user: initialUser,
    isLoading: initialUser ? false : true,
  }))
  
  // Create supabase client, only once, hence useMemo w/ no dependencies
  const supabase = useMemo(() => createClient(), [])
  const isMountedRef = useRef(false)
  // Remember whether the server already seeded the user to avoid extra initial fetch
  const hasInitialUserRef = useRef(Boolean(initialUser))
  // Deduplicate overlapping refreshes so multiple triggers share a single in-flight request
  const syncPromiseRef = useRef<Promise<void> | null>(null)

  // Handle updating mount and unmount state of the component
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // sync claims and load profile
  const syncAndLoadProfile = useCallback(() => {
    // if component not mounted, do nothing
    if (!isMountedRef.current) {
      return Promise.resolve()
    }

    // if another caller already started a refresh, just return THAT promise, don't run another
    if (syncPromiseRef.current) {
      return syncPromiseRef.current
    }

    // start a new refresh
    const promise = (async () => {
      // set loading state to true
      setState((prev) => ({ ...prev, isLoading: true }))

      // Get claims from supabase
      const { data: claims, error: claimsError } = await supabase.auth.getClaims()

      // If there are no claims or error, the user is logged out
      if (!claims || claimsError || !claims.claims) {
        if (isMountedRef.current) {
          setState({ user: null, isLoading: false })
        }
        return
      }

      const userClaims = claims.claims
      const userId = userClaims.sub

      // Load profile data from supabase
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('avatar_url, username, created_at')
        .eq('id', userId)
        .maybeSingle()

      // if component not mounted, do nothing
      if (!isMountedRef.current) return

      // Map user data
      const userProfile = mapAuthUserToProfile(
        userClaims,
        profileError ? null : profile
      )

      // set loading state to false, and set the new user data
      setState({ user: userProfile, isLoading: false })
    })()

    // store the promise in the ref
    syncPromiseRef.current = promise

    // if the promise is finally resolved, clear the ref
    promise.finally(() => {
      if (syncPromiseRef.current === promise) {
        syncPromiseRef.current = null
      }
    })

    // return the promise
    return promise
  }, [supabase])

  // Main hook - setup auth listeners
  useEffect(() => {
    const syncEvents: AuthChangeEvent[] = ['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED']
    const signOutEvents: AuthChangeEvent[] = ['SIGNED_OUT', 'USER_DELETED']

    // Sync once on mount whenever we did not render with an initial user.
    if (!hasInitialUserRef.current) {
      syncAndLoadProfile()
    }

    // Only react to auth events that imply the user profile might have changed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (signOutEvents.includes(event)) {
        setState({ user: null, isLoading: false })
        return
      }

      if (syncEvents.includes(event)) {
        syncAndLoadProfile()
      }
    })

    // Keep the profile fresh when a backgrounded tab returns to the foreground
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        syncAndLoadProfile()
      }
    }

    window.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [supabase, syncAndLoadProfile])

  // Pass the data to the components
  const value = useMemo(
    () => ({
      user: state.user,
      isLoading: state.isLoading,
      refreshUser: syncAndLoadProfile,
    }),
    [state.user, state.isLoading, syncAndLoadProfile],
  )

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  )
}

// Hook for accessing the current user
export const useCurrentUser = () => {
  const context = useContext(CurrentUserContext)

  if (context === undefined) {
    throw new Error('useCurrentUser must be used within a CurrentUserProvider')
  }

  return context
}
