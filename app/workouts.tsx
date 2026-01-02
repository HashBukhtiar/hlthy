import React from 'react';
import { StyleSheet, SafeAreaView, View } from 'react-native';
import Workouts from '@/screens/Workouts';
import BottomButtons from '@/components/BottomButtons';

export default function WorkoutsScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        <Workouts />
      </SafeAreaView>
      <BottomButtons />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  content: {
    flex: 1,
  },
});