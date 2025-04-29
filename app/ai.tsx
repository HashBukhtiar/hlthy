import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import AI from '@/screens/AI';
import BottomButtons from '@/components/BottomButtons';

export default function AIScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <AI />
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