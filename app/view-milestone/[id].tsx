import React from 'react';
import { View, StyleSheet } from 'react-native';
import ViewMilestone from '@/screens/ViewMilestone';
import { Stack } from 'expo-router';

export default function ViewMilestoneScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Milestone',
          headerShadowVisible: false,
          headerBackTitle: '',
          headerTintColor: '#FFF',
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTitleStyle: {
            color: '#FFF',
          },
        }}
      />
      <ViewMilestone />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});