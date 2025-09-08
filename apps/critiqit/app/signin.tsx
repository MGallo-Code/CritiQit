// apps/critiqit/app/signin.tsx

import React, { useState } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native'
import { Link, Redirect } from 'expo-router'
import { Button, Input } from '@rneui/themed'
import { makeRedirectUri } from 'expo-auth-session'
import * as QueryParams from 'expo-auth-session/build/QueryParams'
import * as WebBrowser from 'expo-web-browser'
// Custom code
import { Alert } from '../lib/alert'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import GoogleOneTap from '../components/GoogleOneTap'
import { Turnstile } from '@marsidev/react-turnstile'

const redirectTo = makeRedirectUri()

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

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | undefined>()
  const { session, loading: authLoading } = useAuth()

  // Redirect if already authenticated
  if (!authLoading && session) {
    return <Redirect href="/home" />
  }

  // CAPTCHA, Cloudflare Turnstile
  const turnstileSiteKey = process.env.EXPO_PUBLIC_TURNSTILE_SITEKEY
  if (!turnstileSiteKey) {
    Alert.alert('Turnstile token is not set...')
    return <Redirect href="/home" />
  }

  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert('Please fill in all fields')
      return
    }
    
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
      options: {
        captchaToken: captchaToken,
      },
    })

    if (error) Alert.alert('Sign In Error', error.message)
    setLoading(false)
  }

  const performGoogleOAuth = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },

      },
    })
    
    if (error) {
      Alert.alert('OAuth Error', error.message)
      setLoading(false)
      return
    }

    const res = await WebBrowser.openAuthSessionAsync(data?.url ?? '', redirectTo)

    if (res.type === 'success') {
      const { url } = res
      await createSessionFromUrl(url)
    }
    setLoading(false)
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
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Sign in to your account</Text>
      
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

      <Turnstile
        // Already checked for undefined above...
        siteKey={turnstileSiteKey || ''}
        onSuccess={(token) => {
          setCaptchaToken(token)
        }}
      />
      
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button 
          title="Sign In" 
          disabled={loading} 
          onPress={signInWithEmail}
          type="solid"
        />
      </View>
      
      <View style={styles.verticallySpaced}>
        <Text style={styles.helperText}>
          Forgot your password? We'll send you a secure link to sign in.
        </Text>
      </View>

      <View style={styles.verticallySpaced}>
        <TouchableOpacity 
          onPress={performGoogleOAuth}
          style={[styles.googleButton, { opacity: loading ? 0.6 : 1 }]}
          disabled={loading}
        >
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        </TouchableOpacity>
      </View>

      {/* Google One Tap for web users */}
      {Platform.OS === 'web' && <GoogleOneTap />}

      <View style={styles.switchContainer}>
        <Text style={styles.switchText}>Don't have an account? </Text>
        <Link href="/signup" style={styles.switchLink}>
          Sign Up
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
  googleButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  googleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
