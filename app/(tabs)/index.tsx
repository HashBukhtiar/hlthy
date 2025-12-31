import React from 'react';
import { StyleSheet, SafeAreaView, Text, View } from 'react-native';
import HomeFeed from '@/screens/HomeFeed';

export default function HomeScreen() {
  console.log('[HomeScreen] Rendering tabs/index.tsx');
  
  try {
    return (
      <SafeAreaView style={styles.container}>
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
