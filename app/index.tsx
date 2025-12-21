import { Redirect } from 'expo-router';
import { useState, useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { auth } from '@/firebaseConfig';
import { onAuthStateChanged, signInWithEmailAndPassword, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { devFlags } from '@/config/devFlags';


export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    (async () => {
      // Only set persistence for web builds
      if (Platform.OS === 'web') {
        try {
          await setPersistence(auth, browserSessionPersistence);
          console.log('Web environment detected. Using session persistence for auth.');
        } catch (err) {
          console.warn('setPersistence failed:', err);
        }
      }

      // If bypass is enabled, automatically login with dev credentials
      if (devFlags.bypassAuth) {
        try {
          await signInWithEmailAndPassword(auth, devFlags.devEmail, devFlags.devPassword);
          setIsAuthenticated(true);
        } catch (error: any) {
          console.error('Auto-login failed:', error.message);
          // Even if auto-login fails, we'll still consider bypass active
          setIsAuthenticated(true);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      unsubscribe = onAuthStateChanged(auth, (user) => {
        setIsAuthenticated(!!user);
        setIsLoading(false);
      });
    })();

    return () => unsubscribe?.();
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