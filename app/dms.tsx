import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import DMs from '@/screens/DMs';
import BottomButtons from '@/components/BottomButtons';

export default function DMsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <DMs />
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