import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import Settings from '@/screens/Settings';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Settings />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});