import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import Workouts from '@/screens/Workouts';
import BottomButtons from '@/components/BottomButtons';

export default function WorkoutsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Workouts />
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