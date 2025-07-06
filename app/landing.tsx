import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import Landing from '@/screens/Landing';

export default function LandingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Landing />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
}); 