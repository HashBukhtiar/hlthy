import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import CreateWorkout from '@/screens/CreateWorkout';
import BottomButtons from '@/components/BottomButtons';

export default function CreateWorkoutScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <CreateWorkout />
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