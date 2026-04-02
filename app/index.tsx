import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { View, Platform } from 'react-native';
import { auth } from '@/firebaseConfig';
import { onAuthStateChanged, signInWithEmailAndPassword } from '@/features/auth/ui/useSession';
import { devFlags } from '@/config/devFlags';

const { bypassAuth: BYPASS_AUTH, devEmail: DEV_EMAIL, devPassword: DEV_PASSWORD } = devFlags;

export default function Index() {
  const router = useRouter();
  const hasNavigated = useRef(false);

  // For web, navigate synchronously on first render
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    const currentUser = auth.currentUser;
    if (BYPASS_AUTH || currentUser) {
      router.replace('/(tabs)');
    } else {
      router.replace('/landing');
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    if (BYPASS_AUTH) {
      signInWithEmailAndPassword(auth, DEV_EMAIL, DEV_PASSWORD)
        .catch(() => {})
        .finally(() => {
          if (hasNavigated.current) return;
          hasNavigated.current = true;
          requestAnimationFrame(() => router.replace('/(tabs)'));
        });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (hasNavigated.current) return;
      hasNavigated.current = true;
      const dest = user ? '/(tabs)' : '/landing';
      requestAnimationFrame(() => router.replace(dest));
    });

    return () => unsubscribe();
  }, []);

  // Minimal black screen — no children to flatten
  return <View style={{ flex: 1, backgroundColor: '#000' }} />;
}
