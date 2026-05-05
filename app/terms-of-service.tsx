import React from 'react';
import { View, StyleSheet } from 'react-native';
import TermsOfService from '@/screens/TermsOfService';
import { Stack } from 'expo-router';

export default function TermsOfServiceScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <TermsOfService />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
