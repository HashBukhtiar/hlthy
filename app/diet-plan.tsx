import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import DietPlan from '@/screens/DietPlan';
import BottomButtons from '@/components/BottomButtons';

export default function DietPlanScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <DietPlan />
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