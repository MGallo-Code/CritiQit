// apps/critiqit/app/account.tsx

import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native'
import { Link, Redirect } from 'expo-router'
// Custom code
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import LoadingScreen from '../components/LoadingScreen'
import Avatar from '../components/Avatar'
import { Alert } from '../lib/alert'

export default function AccountScreen() {
  const { session, loading } = useAuth()
  const [profileLoading, setProfileLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    if (session) getProfile()
  }, [session])

  // Redirect to auth if not authenticated
  if (!loading && !session) {
    return <Redirect href="/auth" />
  }

  // Show loading while checking authentication
  if (loading) {
    return <LoadingScreen />
  }

  async function getProfile() {
    try {
      setProfileLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, avatar_url`)
        .eq('id', session?.user.id)
        .single()
      
      if (error && status !== 406) {
        throw error
      }

      if (data) {
        setUsername(data.username || '')
        setAvatarUrl(data.avatar_url || '')
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message)
      }
    } finally {
      setProfileLoading(false)
    }
  }

  async function updateProfile({
    username,
    avatar_url,
  }: {
    username: string
    avatar_url: string
  }) {
    try {
      setProfileLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const updates = {
        id: session?.user.id,
        username,
        avatar_url,
        updated_at: new Date(),
      }

      const { error } = await supabase.from('profiles').upsert(updates)

      if (error) {
        throw error
      }
      
      Alert.alert('Profile updated successfully!')
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message)
      }
    } finally {
      setProfileLoading(false)
    }
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error.message)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account</Text>
      
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <Avatar
          size={120}
          url={avatarUrl}
          onUpload={(url: string) => {
            setAvatarUrl(url)
            updateProfile({ username, avatar_url: url })
          }}
        />
      </View>

      {session?.user && (
        <View style={styles.userInfo}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{session.user.email}</Text>
          
          <Text style={styles.label}>Username:</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              autoCapitalize="none"
            />
          </View>
          
          {session.user.user_metadata?.full_name && (
            <>
              <Text style={styles.label}>Full Name:</Text>
              <Text style={styles.value}>{session.user.user_metadata.full_name}</Text>
            </>
          )}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.updateButton, { opacity: profileLoading ? 0.6 : 1 }]} 
          onPress={() => updateProfile({ username, avatar_url: avatarUrl })}
          disabled={profileLoading}
        >
          <Text style={styles.updateButtonText}>
            {profileLoading ? 'Updating...' : 'Update Profile'}
          </Text>
        </TouchableOpacity>

        <Link href="/home" style={styles.backLink}>
          ← Back to Home
        </Link>
        
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
    textAlign: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  userInfo: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 15,
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  inputContainer: {
    marginBottom: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  actions: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  updateButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  updateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backLink: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 20,
    textDecorationLine: 'underline',
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})
