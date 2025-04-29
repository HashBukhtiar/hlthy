import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import SelectArchetype from '@/screens/SelectArchetype';

export default function SelectArchetypeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <SelectArchetype />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});