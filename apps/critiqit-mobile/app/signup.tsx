// apps/critiqit/app/signup.tsx

import React, { useState } from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { Link, Redirect, useRouter } from 'expo-router' 
import { Button, Input } from '@rneui/themed'
import { Turnstile } from '../components/Turnstile'
// Custom code
import { supabase } from '../lib/supabase'
import { Alert } from '../lib/alert'
import { useAuth } from '../lib/auth-context'


export default function SignUpScreen() {
  const router = useRouter() 

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | undefined>()
  const { session, loading: authLoading } = useAuth()

  // Redirect if already authenticated
  if (!authLoading && session) {
    return <Redirect href="/home" />
  }

  async function signUpWithEmail() {
    if (!captchaToken) {
      Alert.alert('Please solve the captcha')
      return
    }

    if (!email || !password || !confirmPassword) {
      Alert.alert('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please make sure your passwords match.')
      return
    }

    if (password.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters long.')
      return
    }

    setLoading(true)
    const { data: { user }, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        captchaToken,
      },
    })

    console.log(user);

    setLoading(false)

    if (error) {
      Alert.alert('Sign Up Error', error.message)
    } else if (user) {
      console.log('User created, redirecting to confirmation page');
      router.push({
        pathname: '/confirm-email',
        params: { email: email },
      })
    }
  }

  if (authLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Sign up to get started</Text>
      
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Input
          label="Email"
          leftIcon={{ type: 'font-awesome', name: 'envelope' }}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="email@address.com"
          autoCapitalize={'none'}
          keyboardType="email-address"
        />
      </View>
      
      <View style={styles.verticallySpaced}>
        <Input
          label="Password"
          leftIcon={{ type: 'font-awesome', name: 'lock' }}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          placeholder="Password"
          autoCapitalize={'none'}
        />
      </View>

      <View style={styles.verticallySpaced}>
        <Input
          label="Confirm Password"
          leftIcon={{ type: 'font-awesome', name: 'lock' }}
          onChangeText={(text) => setConfirmPassword(text)}
          value={confirmPassword}
          secureTextEntry={true}
          placeholder="Confirm Password"
          autoCapitalize={'none'}
        />
      </View>

      <Turnstile
        onTokenReceived={(token) => setCaptchaToken(token)}
      />
      
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button 
          title="Sign Up" 
          disabled={loading} 
          onPress={signUpWithEmail}
          type="solid"
        />
      </View>
      
      <View style={styles.verticallySpaced}>
        <Text style={styles.helperText}>
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>

      <View style={styles.switchContainer}>
        <Text style={styles.switchText}>Already have an account? </Text>
        <Link href="/signin" style={styles.switchLink}>
          Sign In
        </Link>
      </View>

      <View style={styles.backContainer}>
        <Link href="/home" style={styles.backLink}>
          ← Back to Home
        </Link>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 18,
    color: '#666',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  mt20: {
    marginTop: 20,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  switchText: {
    fontSize: 14,
    color: '#666',
  },
  switchLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  backContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  backLink: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline',
  },
})
