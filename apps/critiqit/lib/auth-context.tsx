import React, { useState, useEffect, createContext, useContext } from 'react'
import { AppState } from 'react-native'
import { supabase } from './supabase'
import { makeRedirectUri } from 'expo-auth-session'
import * as Linking from 'expo-linking'
import * as QueryParams from 'expo-auth-session/build/QueryParams'
import * as WebBrowser from 'expo-web-browser'
import { Session } from '@supabase/supabase-js'
import { Alert } from './alert'

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

// Required for web only
WebBrowser.maybeCompleteAuthSession()
const redirectTo = makeRedirectUri()

// --- Helper Functions for OAuth & Deep Linking ---

const createSessionFromUrl = async (url: string) => {
  const { params, errorCode } = QueryParams.getQueryParams(url)

  if (errorCode) Alert.alert(errorCode)
  const { access_token, refresh_token } = params

  if (!access_token) return

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  })
  if (error) Alert.alert(error.message)
  return data.session
}

// --- Auth Context ---

interface AuthContextType {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        console.log('Initial session:', session ? 'Found' : 'None')
        setSession(session)
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (mounted) {
        console.log('Auth state change:', event, session ? 'Session found' : 'No session')
        console.log('Event details:', { event, session: session ? 'exists' : 'null' })
        setSession(session)
        setLoading(false)
      }
    })

    // Handle incoming deep links
    const handleUrl = (url: string) => {
      createSessionFromUrl(url)
    }
    
    const linkingListener = Linking.addEventListener('url', ({ url }) => handleUrl(url))
    
    return () => {
      mounted = false
      subscription.unsubscribe()
      linkingListener?.remove()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
