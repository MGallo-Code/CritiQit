// apps/critiqit/components/GoogleOneTap.tsx

import { useEffect } from 'react'
import { Platform } from 'react-native'
// Custom code
import { supabase } from '../lib/supabase'
import { Alert } from '../lib/alert'

// TypeScript declarations for Google Identity Services with FedCM
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: any) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
            use_fedcm_for_prompt?: boolean
            use_fedcm_for_button?: boolean
            button_auto_select?: boolean
          }) => void
          prompt: (callback?: (notification: any) => void) => void
        }
      }
    }
  }
}

export default function GoogleOneTap() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Get Google Client ID from environment variables
      const google_client_id = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
      if (!google_client_id) {
        console.error('Google Client ID is not set in the environment variables.')
        return;
      }
      // Load Google Identity Services
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      document.head.appendChild(script)

      script.onload = () => {
        // Initialize Google One Tap
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: google_client_id,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
            use_fedcm_for_prompt: true, // Enable FedCM for One Tap
          })

          // Render the One Tap prompt
          window.google.accounts.id.prompt()
        }
      }

      return () => {
        // Cleanup
        if (document.head.contains(script)) {
          document.head.removeChild(script)
        }
      }
    }
  }, [])

  const handleCredentialResponse = async (response: any) => {
    try {
      // Exchange the credential for a session
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      })

      if (error) {
        Alert.alert('Authentication Error', error.message)
      }
    } catch (error) {
      Alert.alert('Authentication Error', 'Something went wrong')
    }
  }

  return null // This component doesn't render anything visible
}
