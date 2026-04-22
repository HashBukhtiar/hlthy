import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import PrivacyPolicy from '@/screens/PrivacyPolicy';
import { Stack } from 'expo-router';

export default function PrivacyPolicyScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Privacy Policy',
          headerShadowVisible: false,
          headerBackTitle: '',
          headerTintColor: '#FFF',
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTitleStyle: {
            color: '#FFF',
            fontSize: 17,
            fontWeight: '600',
          },
          headerBackButtonMenuEnabled: false,
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
