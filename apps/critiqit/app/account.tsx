import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import { Link, Redirect } from 'expo-router'

export default function AccountScreen() {
  const { session, loading } = useAuth()

  // Redirect to auth if not authenticated
  if (!loading && !session) {
    return <Redirect href="/auth" />
  }

  // Show loading while checking authentication
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
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
      
      {session?.user && (
        <View style={styles.userInfo}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{session.user.email}</Text>
          
          <Text style={styles.label}>User ID:</Text>
          <Text style={styles.value}>{session.user.id}</Text>
          
          {session.user.user_metadata?.full_name && (
            <>
              <Text style={styles.label}>Full Name:</Text>
              <Text style={styles.value}>{session.user.user_metadata.full_name}</Text>
            </>
          )}
        </View>
      )}

      <View style={styles.actions}>
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
  actions: {
    flex: 1,
    justifyContent: 'flex-end',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
})
