import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import Workouts from '@/screens/Workouts';

export default function WorkoutsTabScreen() {
  console.log('[WorkoutsTabScreen] Rendering tabs/workouts.tsx');
  
  return (
    <SafeAreaView style={styles.container}>
      <Workouts />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});
