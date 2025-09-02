import React from 'react';
import { View, StyleSheet } from 'react-native';
import TermsOfService from '@/screens/TermsOfService';
import { Stack } from 'expo-router';

export default function TermsOfServiceScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Terms of Service',
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
      <TermsOfService />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});