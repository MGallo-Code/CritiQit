import React, { useEffect } from 'react'
import { Platform, Alert } from 'react-native'
import { supabase } from '../lib/supabase'

// TypeScript declarations for Google Identity Services
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: (callback?: (notification: any) => void) => void
        }
      }
    }
  }
}

export default function GoogleOneTap() {
  useEffect(() => {
    if (Platform.OS === 'web') {
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
            client_id: '1075700773857-b0ao16bjk3rbtg51ps2a0fivvjci5p05.apps.googleusercontent.com',
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          })

          // Render the One Tap prompt
          window.google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              // One Tap was not displayed or was skipped
              console.log('One Tap not displayed or skipped')
            }
          })
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
