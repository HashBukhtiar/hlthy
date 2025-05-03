import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import HomeFeed from '@/screens/HomeFeed';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <HomeFeed />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});
