import { Redirect } from 'expo-router';
import { useState, useEffect } from 'react';
import { View, ActivityIndicator, Platform, Text } from 'react-native';
import { auth } from '@/firebaseConfig';
import { onAuthStateChanged, signInWithEmailAndPassword, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { devFlags } from '@/config/devFlags';

const { bypassAuth: BYPASS_AUTH, devEmail: DEV_EMAIL, devPassword: DEV_PASSWORD } = devFlags;

// Log immediately when file loads
console.log('===== INDEX.TSX FILE LOADED =====');
console.log('Platform:', Platform.OS);
console.log('BYPASS_AUTH:', BYPASS_AUTH);

export default function Index() {
  console.log('===== INDEX COMPONENT RENDERING =====');
  
  // For web, just check auth.currentUser synchronously
  if (Platform.OS === 'web') {
    console.log('[Index] Web platform detected, checking auth immediately');
    const currentUser = auth.currentUser;
    console.log('[Index] Current user:', currentUser?.uid || 'none');
    
    if (BYPASS_AUTH) {
      console.log('[Index] BYPASS_AUTH enabled, redirecting to tabs');
      return <Redirect href="/(tabs)" />;
    }
    
    if (currentUser) {
      console.log('[Index] User authenticated, redirecting to tabs');
      return <Redirect href="/(tabs)" />;
    } else {
      console.log('[Index] No user, redirecting to landing');
      return <Redirect href="/landing" />;
    }
  }
  
  // For mobile, use the normal flow with state
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    console.log('[Index] useEffect running (mobile only)');
    
    if (BYPASS_AUTH) {
      signInWithEmailAndPassword(auth, DEV_EMAIL, DEV_PASSWORD)
        .then(() => setIsAuthenticated(true))
        .catch(() => setIsAuthenticated(true))
        .finally(() => setIsLoading(false));
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  console.log('[Index] Mobile render state - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={{ color: '#FFF', marginTop: 20, fontSize: 18 }}>Loading App...</Text>
        <Text style={{ color: '#888', marginTop: 10, fontSize: 14 }}>Platform: {Platform.OS}</Text>
      </View>
    );
  }

  console.log('[Index] Redirecting to:', isAuthenticated ? '/(tabs)' : '/landing');
  
  // If user is authenticated or bypass is enabled, redirect to home feed, otherwise to landing page
  return isAuthenticated ? <Redirect href="/(tabs)" /> : <Redirect href="/landing" />;
}