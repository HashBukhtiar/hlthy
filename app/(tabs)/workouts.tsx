import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Workouts from '@/screens/Workouts';

export default function WorkoutsTabScreen() {
  console.log('[WorkoutsTabScreen] Rendering tabs/workouts.tsx');
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
