import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { supabase } from '../lib/supabase'

export default function HomeScreen() {
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error.message)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to CritiQit!</Text>
      <Text style={styles.subtitle}>You are successfully signed in.</Text>
      <Text style={styles.signOut} onPress={handleSignOut}>
        Sign Out
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  signOut: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
})
