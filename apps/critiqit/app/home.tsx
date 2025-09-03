import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

import { Link } from 'expo-router';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to CritiQit!</Text>
      <Link href="/account" style={styles.accountLink}>
        View Account
      </Link>
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
})
