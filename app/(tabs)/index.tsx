import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomeFeed from '@/screens/HomeFeed';

export default function HomeScreen() {
  try {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <HomeFeed />
      </SafeAreaView>
    );
  } catch (error) {
    console.error('[HomeScreen] Error rendering:', error);
    return (
      <View style={styles.container}>
        <Text style={{ color: 'white' }}>Error loading home screen</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});
