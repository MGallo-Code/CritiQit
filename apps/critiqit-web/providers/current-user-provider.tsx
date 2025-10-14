'use client'

import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { usePathname } from 'next/navigation'

interface UserProfile {
  email: string
  avatar_url: string | null
  username: string
  full_name: string | null
  created_at: string | null
}

// Structure passed to components
interface CurrentUserContextValue {
  user: UserProfile | null
  isLoading: boolean
}

// Create channel for data to be passed to components
const CurrentUserContext = createContext<CurrentUserContextValue | undefined>(undefined)

// Pulls data from session and profile table, unifies the data
const mapSessionToUser = (
  session: Session,
  profile: Partial<UserProfile> | null,
): UserProfile => {
  const metadata = session.user.user_metadata ?? {}
  
  return {
    email: (profile?.email as string | undefined) ?? (metadata.email as string | undefined) ?? '',
    avatar_url: profile?.avatar_url ?? null,
    username: (profile?.username as string | undefined) ?? '',
    full_name: (profile?.full_name as string | undefined) ?? 'Not Set',
    created_at: session.user?.created_at ?? null
  }
}

// Main component, wraps components receiving the data
export const CurrentUserProvider = ({ children }: { children: ReactNode }) => {
  // State of the data/component
  const [state, setState] = useState<CurrentUserContextValue>({
    user: null,
    isLoading: true,
  })
  // Follow path changes, for syncing session
  const pathname = usePathname()
  // Create supabase client, only once, hence useMemo w/ no dependencies
  const supabase = useMemo(() => createClient(), [])
  const isMountedRef = useRef(false)

  // Handle mounting and unmounting of the component
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // When supabase state changes, load profile data
  //   Ensure doesn't re-run on every render
  const loadProfile = useCallback(
    async (session: Session) => {
      // Get user ID from session
      const userId = session?.user?.id ?? session?.user?.user_metadata?.sub ?? undefined;

      // if no user ID, return null
      if (!userId) {
        return mapSessionToUser(session, null)
      }

      // Load profile data from supabase
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('avatar_url, username, full_name')
        .eq('id', userId)
        .maybeSingle()

      // If didn't fetch profile, but session still set (assumed at this point),
      //   assume middleware within auth state changes
      //   and use the current user until next auth state change
      if (error) {
        console.error('[CurrentUserProvider] Failed to load profile, assuming middleware within auth state changes, so using current user until next auth state change', error)
        return mapSessionToUser(session, state.user ?? null)
      }

      return mapSessionToUser(session, profile ?? null)
    },
    [supabase],
  )

  // When session changes, update the state
  const applySession = useCallback(
    async (session: Session | null) => {
      // if the component has unmounted, do nothing.
      if (!isMountedRef.current) {
        return
      }
  
      // If there no session, the user is logged out.
      if (!session) {
        setState({ user: null, isLoading: false })
        return
      }
  
      // The session object includes an 'expires_at' timestamp (in seconds).
      // Check if the current time is past the expiration time.
      const isExpired = session.expires_at! * 1000 < Date.now();
  
      // If token is expired, don't try to load the profile, wait. 
      //   onAuthStateChange listener should fire again shortly
      //   with new session
      if (isExpired) {
        setState((prev) => ({ ...prev, isLoading: true }));
        return;
      }
  
      // If token is not expired, proceed with loading the profile.
      setState((prev) => ({ ...prev, isLoading: true }))
      const userProfile = await loadProfile(session)
  
      if (!isMountedRef.current) {
        return
      }
  
      // Fetched profile, so set the state
      setState({ user: userProfile, isLoading: false })
    },
    [loadProfile],
  )

  // Sync the session
  const syncSession = useCallback(async () => {
    // get session from supabase
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      console.error('[CurrentUserProvider] Failed to load session', error)
    }

    await applySession(session ?? null)
  }, [supabase, applySession])

  // Main hook, syncs the session
  useEffect(() => {

    // Sync the session to see if user is logged in
    void syncSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session ?? null)
    })

    // Handle tab visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void syncSession()
      }
    }

    // Listen for visibility changes
    window.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      subscription.unsubscribe()
      window.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [supabase, applySession, syncSession])

  // Sync the session when the pathname changes
  useEffect(() => {
    void syncSession()
  }, [pathname, syncSession])

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
