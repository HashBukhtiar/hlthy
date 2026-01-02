import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import ViewWorkout from '@/screens/ViewWorkout';

export default function ViewWorkoutScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ViewWorkout />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});