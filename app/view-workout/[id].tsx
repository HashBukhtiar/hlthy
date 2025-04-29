import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import ViewWorkout from '@/screens/ViewWorkout';
import BottomButtons from '@/components/BottomButtons';

export default function ViewWorkoutScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ViewWorkout />
      <BottomButtons />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});