// apps/critiqit/app/index.tsx

import { Redirect } from 'expo-router';
import React from 'react';
// Custom code
import { useAuth } from '../lib/auth-context';
import LoadingScreen from '../components/LoadingScreen';

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return <Redirect href="/home" />;
}