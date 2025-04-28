import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import Profile from '@/screens/Profile';
import BottomButtons from '@/components/BottomButtons';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Profile />
      <BottomButtons />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});