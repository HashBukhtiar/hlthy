import { Redirect } from 'expo-router';
import { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { auth } from '@/firebaseConfig';
import { onAuthStateChanged, signInWithEmailAndPassword, getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';

// Backdoor to bypass login. must be false in production
const BYPASS_AUTH = false;
const DEV_EMAIL = 'dev2@gmail.com';
const DEV_PASSWORD = 'dev1232';

// if (typeof window !== "undefined") {
//   const auth = getAuth();
//   setPersistence(auth, browserSessionPersistence);
// }

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // If bypass is enabled, automatically login with dev credentials
    if (BYPASS_AUTH) {
      signInWithEmailAndPassword(auth, DEV_EMAIL, DEV_PASSWORD)
        .then(() => {
          setIsAuthenticated(true);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Auto-login failed:', error.message);
          // Even if auto-login fails, we'll still consider bypass active
          setIsAuthenticated(true);
          setIsLoading(false);
        });
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