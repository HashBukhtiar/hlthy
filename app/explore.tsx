import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import Explore from '@/screens/Explore';

export default function ExploreScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Explore />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});