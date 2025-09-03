// apps/critiqit/app/auth.tsx

import React, { useState, useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { Redirect } from 'expo-router'
// Custom code
import { useAuth } from '../lib/auth-context'
import SignInForm from '../components/SignInForm'
import SignUpForm from '../components/SignUpForm'

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false)
  const { session, loading } = useAuth()

  // Redirect to home if already authenticated
  if (!loading && session) {
    return <Redirect href="/home" />
  }

  return (
    <View style={styles.mainContainer}>
      {isSignUp ? (
        <SignUpForm onSwitchToSignIn={() => setIsSignUp(false)} />
      ) : (
        <SignInForm onSwitchToSignUp={() => setIsSignUp(true)} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
})
