import { Redirect } from 'expo-router';
import { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { auth } from '@/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

// Backdoor to bypass login. must be false in production
const BYPASS_AUTH = true;

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // If bypass is enabled, set authenticated to true immediately
    if (BYPASS_AUTH) {
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  // If user is authenticated or bypass is enabled, redirect to home feed, otherwise to landing page
  return isAuthenticated ? <Redirect href="/(tabs)" /> : <Redirect href="/landing" />;
}