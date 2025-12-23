import React, { useEffect } from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import Landing from '@/screens/Landing';

export default function LoginScreen() {
  const router = useRouter();

  // Redirect to landing page since login is now handled there
  useEffect(() => {
    router.replace('/landing');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Landing />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});