import React from 'react';
import { StyleSheet, View } from 'react-native';
import Landing from '@/screens/Landing';

export default function LandingScreen() {
  return (
    <View style={styles.container}>
      <Landing />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
}); 