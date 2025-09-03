// apps/critiqit/app/home.tsx

import React from 'react'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { Link } from 'expo-router';
// Custom code
import { useAuth } from '../lib/auth-context';
import LoadingScreen from '../components/LoadingScreen';
import GoogleOneTap from '../components/GoogleOneTap';


export default function HomeScreen() {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      {!session && !loading && <GoogleOneTap />}
      <Text style={styles.title}>Welcome to CritiQit!</Text>
      {session ? (
        <Link href="/account" style={styles.accountLink}>
          View Account
        </Link>
      ) : (
        <Link href="/auth" style={styles.authLink}>
          Sign In
        </Link>
      )}
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
    marginBottom: 30,
    color: '#333',
  },

  accountLink: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  authLink: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
})
