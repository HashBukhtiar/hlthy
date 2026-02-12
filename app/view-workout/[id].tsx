import React from 'react';
import { StyleSheet, View } from 'react-native';
import ViewWorkout from '@/screens/ViewWorkout';

export default function ViewWorkoutScreen() {
  return (
    <View style={styles.container}>
      <ViewWorkout />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});