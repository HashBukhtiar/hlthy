import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import Profile from '@/screens/Profile';

export default function ProfileTabScreen() {
  console.log('[ProfileTabScreen] Rendering tabs/profile.tsx');
  
  return (
    <SafeAreaView style={styles.container}>
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
