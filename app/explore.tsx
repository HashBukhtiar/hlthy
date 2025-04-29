import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import Explore from '@/screens/Explore';
import BottomButtons from '@/components/BottomButtons';

export default function ExploreScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Explore />
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