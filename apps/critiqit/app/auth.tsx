import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import SignInForm from '../components/SignInForm'
import SignUpForm from '../components/SignUpForm'

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false)

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
