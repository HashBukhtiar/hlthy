import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import Pulse from '@/screens/Pulse';

export default function PulseScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Pulse />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});