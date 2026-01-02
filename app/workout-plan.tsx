import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import WorkoutPlan from '@/screens/WorkoutPlan';

export default function WorkoutPlanScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <WorkoutPlan />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});