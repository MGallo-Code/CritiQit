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
import type { User, Claims } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { mapAuthUserToProfile, type UserProfile } from '@/lib/auth/user'

// Structure passed to components
interface CurrentUserContextValue {
  user: UserProfile | null
  isLoading: boolean
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
  const hasInitialUserRef = useRef(Boolean(initialUser))

  // Handle updating mount and unmount state of the component
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // When claims change, update the state, load profile data
  //   Ensure doesn't re-run on every render
  //   Called when claims change
  const loadProfile = useCallback(
    async (claims: Claims) => {
      // Get user ID from the verified auth user
      const userId = claims.sub;

      // Load profile data from supabase
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('avatar_url, username, full_name')
        .eq('id', userId)
        .maybeSingle()
      
      // if error, return the current user profile,
      //   shouldn't happen but just in case.
      if (error) {
        console.error('[CurrentUserProvider (loadProfile)] Failed to load profile', error)
        return mapAuthUserToProfile(claims, null)
      }

      // return the profile data, should be valid if no error
      return mapAuthUserToProfile(claims, profile)
    },
    [supabase, state.user],
  )

  // Sync and apply claims
  const syncClaims = useCallback(async () => {
    // if component unmounted, do nothing.
    if (!isMountedRef.current) {
      return
    }

    // set loading for claims change
    setState((prev) => ({ ...prev, isLoading: true }))

    // get claims from supabase
    const {
      data: claims,
      error: claimsError,
    } = await supabase.auth.getClaims();

    // If there are no claims or error, the user is logged out.
    if (!claims || claimsError) {
      if (!isMountedRef.current) {
        return
      }
      setState({ user: null, isLoading: false })
      return
    }

    // load profile data from supabase
    const userProfile = await loadProfile(claims.claims)

    if (!isMountedRef.current) {
      return
    }

    // Fetched profile, so set the state
    setState({ user: userProfile, isLoading: false })
  }, [supabase, loadProfile])

  // Main hook, syncs the session
  useEffect(() => {

    // Sync the claims to see if user is logged in
    if (!hasInitialUserRef.current) {
      void syncClaims()
    }

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event) => {
      void syncClaims()
    })

    // Handle tab visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void syncClaims()
      }
    }

    // Listen for visibility changes
    window.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      subscription.unsubscribe()
      window.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [supabase, syncClaims])

  // Pass the data to the components
  const value = useMemo(
    () => ({ user: state.user, isLoading: state.isLoading }),
    [state.user, state.isLoading],
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
