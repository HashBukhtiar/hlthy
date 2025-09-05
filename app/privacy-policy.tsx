import React from 'react';
import { View, StyleSheet } from 'react-native';
import PrivacyPolicy from '@/screens/PrivacyPolicy';
import { Stack } from 'expo-router';

export default function PrivacyPolicyScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Privacy Policy',
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
      <PrivacyPolicy />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});