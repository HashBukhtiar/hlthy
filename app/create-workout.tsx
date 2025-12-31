import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import CreateWorkout from '@/screens/CreateWorkout';

export default function CreateWorkoutScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <CreateWorkout />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});