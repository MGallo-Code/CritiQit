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
  const [isEditing, setIsEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [fullName, setFullName] = useState('')
  const [originalUsername, setOriginalUsername] = useState('')
  const [originalAvatarUrl, setOriginalAvatarUrl] = useState('')
  const [originalFullName, setOriginalFullName] = useState('')

  useEffect(() => {
    if (session) getProfile()
  }, [session])

  // Redirect to signin if not authenticated
  if (!loading && !session) {
    return <Redirect href="/signin" />
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
        .select(`username, avatar_url, full_name`)
        .eq('id', session?.user.id)
        .single()

      if (error && status !== 406) {
        throw error
      }

      if (data) {
        const userData = data.username || ''
        const avatarData = data.avatar_url || ''
        const fullNameData = data.full_name || ''

        // Construct the display URL with a cache-buster
        const displayAvatarUrl = avatarData
          ? `${supabase.storage.from('avatars').getPublicUrl(avatarData).data.publicUrl}?v=${Date.now()}`
          : ''

        setUsername(userData)
        setAvatarUrl(displayAvatarUrl)
        setFullName(fullNameData)
        setOriginalUsername(userData)
        setOriginalAvatarUrl(displayAvatarUrl)
        setOriginalFullName(fullNameData)
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message)
      }
    } finally {
      setProfileLoading(false)
    }
  }

  async function handleAvatarUpload(filePath: string) {
    try {
      setProfileLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      // Update the database with the CLEAN file path
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: filePath,
          updated_at: new Date()
        })
        .eq('id', session.user.id)

      if (updateError) {
        throw updateError
      }

      // Construct the display URL with cache-busting
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const newDisplayUrl = `${data.publicUrl}?v=${Date.now()}`

      // Update local state to trigger a re-render with the new URL
      setAvatarUrl(newDisplayUrl)
      setOriginalAvatarUrl(newDisplayUrl)
      Alert.alert('Avatar updated successfully!')

    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error', error.message)
      }
    } finally {
      setProfileLoading(false)
    }
  }

  async function updateProfile() {
    try {
      setProfileLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const updates: any = {
        id: session?.user.id,
        updated_at: new Date(),
      }

      if (username !== originalUsername) {
        updates.username = username
      }
      if (fullName !== originalFullName) {
        updates.full_name = fullName
      }

      if (Object.keys(updates).length > 2) {
        const { error } = await supabase.from('profiles').upsert(updates)
        if (error) throw error
        Alert.alert('Profile updated successfully!')
      } else {
        Alert.alert('No changes to save')
      }
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

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    // Reset to original values
    setUsername(originalUsername)
    setFullName(originalFullName)
    setAvatarUrl(originalAvatarUrl) // Reset avatar URL on cancel
    setIsEditing(false)
  }

  const handleSave = async () => {
    try {
      await updateProfile()
      setOriginalUsername(username)
      setOriginalFullName(fullName)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving profile:', error)
    }
  }

  const hasChanges = username !== originalUsername || fullName !== originalFullName

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
        {!isEditing && (
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <Avatar
          size={120}
          url={avatarUrl}
          onUpload={isEditing ? handleAvatarUpload : undefined}
        />
      </View>

      {session?.user && (
        <View style={styles.userInfo}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{session.user.email}</Text>

          <Text style={styles.label}>Username:</Text>
          {isEditing ? (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                autoCapitalize="none"
                editable={isEditing}
              />
            </View>
          ) : (
            <Text style={styles.value}>{username || 'Not set'}</Text>
          )}

          <Text style={styles.label}>Full Name:</Text>
          {isEditing ? (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter full name"
                autoCapitalize="words"
                editable={isEditing}
              />
            </View>
          ) : (
            <Text style={styles.value}>{fullName || 'Not set'}</Text>
          )}
        </View>
      )}

      <View style={styles.actions}>
        {isEditing ? (
          <>
            <TouchableOpacity
              style={[styles.saveButton, { opacity: profileLoading || !hasChanges ? 0.6 : 1 }]}
              onPress={handleSave}
              disabled={profileLoading || !hasChanges}
            >
              <Text style={styles.saveButtonText}>
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={profileLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Link href="/home" style={styles.backLink}>
              ← Back to Home
            </Link>

            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </>
        )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
  saveButton: {
    backgroundColor: '#34C759',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelButtonText: {
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