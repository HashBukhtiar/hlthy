import React from 'react';
import { StyleSheet, View } from 'react-native';
import Explore from '@/screens/Explore';

export default function ExploreScreen() {
  return (
    <View style={styles.container}>
      <Explore />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});