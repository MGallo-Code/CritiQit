import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native'
import { Link, Redirect, useLocalSearchParams } from 'expo-router'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import LoadingScreen from '../components/LoadingScreen'

export default function ConfirmEmailScreen() {
  const { session, loading } = useAuth()
  const [token, setToken] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  
  const params = useLocalSearchParams()
  const emailParam = params.email as string

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [emailParam])

  // Redirect if already authenticated
  if (!loading && session) {
    return <Redirect href="/home" />
  }

  // Show loading while checking authentication
  if (loading) {
    return <LoadingScreen />
  }

  const handleVerifyToken = async () => {
    if (!token.trim()) {
      setError('Please enter the verification token')
      return
    }

    try {
      setIsVerifying(true)
      setError('')
      setMessage('')

      const { data, error } = await supabase.auth.verifyOtp({
        token: token.trim(),
        type: 'email',
        email: email.trim()
      })

      if (error) {
        setError(error.message)
      } else if (data.user) {
        setMessage('Email verified successfully! Redirecting...')
        // The auth context will automatically handle the session update
        // and redirect to home page
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Verification error:', err)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendToken = async () => {
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    try {
      setIsResending(true)
      setError('')
      setMessage('')

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim()
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage('Verification email sent! Please check your inbox.')
      }
    } catch (err) {
      setError('Failed to resend verification email. Please try again.')
      console.error('Resend error:', err)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We've sent a verification token to your email address.
        </Text>

        {message ? (
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isVerifying && !isResending}
          />

          <Text style={styles.label}>Verification Token</Text>
          <TextInput
            style={styles.input}
            value={token}
            onChangeText={setToken}
            placeholder="Enter the 6-digit token from your email"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            editable={!isVerifying && !isResending}
          />

          <TouchableOpacity
            style={[styles.verifyButton, (isVerifying || !token.trim()) && styles.disabledButton]}
            onPress={handleVerifyToken}
            disabled={isVerifying || !token.trim()}
          >
            <Text style={styles.verifyButtonText}>
              {isVerifying ? 'Verifying...' : 'Verify Email'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.resendButton, (isResending || !email.trim()) && styles.disabledButton]}
            onPress={handleResendToken}
            disabled={isResending || !email.trim()}
          >
            <Text style={styles.resendButtonText}>
              {isResending ? 'Sending...' : 'Resend Verification Email'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Link href="/signin" style={styles.backLink}>
            ← Back to Sign In
          </Link>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  form: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  resendButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.6,
  },
  messageContainer: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginBottom: 20,
  },
  messageText: {
    color: '#155724',
    fontSize: 14,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#721c24',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  backLink: {
    fontSize: 14,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
})
