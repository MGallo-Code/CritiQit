import React, { useState } from 'react'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import { supabase } from '../lib/supabase'
import { Button, Input } from '@rneui/themed'
import { Alert } from '../lib/alert'

interface SignUpFormProps {
  onSwitchToSignIn: () => void
}

export default function SignUpForm({ onSwitchToSignIn }: SignUpFormProps) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signUpWithEmail() {
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
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName.trim() || undefined
        }
      }
    })

    if (error) Alert.alert('Sign Up Error', error.message)
    if (!session) Alert.alert('Account Created!', 'Please check your inbox for email verification.')
    setLoading(false)
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
          label="Full Name (Optional)"
          leftIcon={{ type: 'font-awesome', name: 'user' }}
          onChangeText={(text) => setFullName(text)}
          value={fullName}
          placeholder="John Doe"
          autoCapitalize={'words'}
        />
      </View>
      
      <View style={styles.verticallySpaced}>
        <Input
          label="Password"
          leftIcon={{ type: 'font-awesome', name: 'lock' }}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          placeholder="Password (min 6 characters)"
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
          placeholder="Confirm your password"
          autoCapitalize={'none'}
        />
      </View>
      
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button 
          title="Create Account" 
          disabled={loading} 
          onPress={signUpWithEmail}
          type="solid"
        />
      </View>

      <View style={styles.switchContainer}>
        <Text style={styles.switchText}>Already have an account? </Text>
        <TouchableOpacity onPress={onSwitchToSignIn}>
          <Text style={styles.switchLink}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 20,
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 12,
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
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  switchText: {
    fontSize: 16,
    color: '#666',
  },
  switchLink: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
})
