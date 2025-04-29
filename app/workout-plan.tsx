import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import WorkoutPlan from '@/screens/WorkoutPlan';
import BottomButtons from '@/components/BottomButtons';

export default function WorkoutPlanScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <WorkoutPlan />
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