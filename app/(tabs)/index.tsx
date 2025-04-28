import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import HomeFeed from '@/screens/HomeFeed';
import BottomButtons from '@/components/BottomButtons';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <HomeFeed />
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
