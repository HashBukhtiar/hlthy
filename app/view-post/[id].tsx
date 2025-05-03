import React from 'react';
import { View, StyleSheet } from 'react-native';
import ViewPost from '@/screens/ViewPost';
import { Stack, useLocalSearchParams } from 'expo-router';

export default function ViewPostScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Post',
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
      <ViewPost />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});