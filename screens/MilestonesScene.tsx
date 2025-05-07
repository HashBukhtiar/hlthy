import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MilestonesScene() {
  return (
    <View style={styles.container}>
      <Text style={styles.emptyText}>No milestones to display</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  emptyText: {
    color: 'gray',
    fontSize: 16,
    fontWeight: 'bold',
  },
});