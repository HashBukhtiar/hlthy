import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Profile from '@/screens/Profile';

export default function ProfileTabScreen() {
  console.log('[ProfileTabScreen] Rendering tabs/profile.tsx');
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Profile />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});
