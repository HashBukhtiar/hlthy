import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import EmailVerificationGuard from '@/components/EmailVerificationGuard';
import BottomButtons from '@/components/BottomButtons';

console.log('[TabLayout] Module loaded');

export default function TabLayout() {
  console.log('[TabLayout] Component rendering');
  
  const colorScheme = useColorScheme();
  console.log('[TabLayout] colorScheme:', colorScheme);

  return (
    <EmailVerificationGuard>
      <View style={styles.container}>
        <View style={styles.content}>
          <Tabs
            screenOptions={{
              tabBarStyle: { display: 'none' },
              headerShown: false,
              lazy: false,
              freezeOnBlur: false,
            }}
          >
            <Tabs.Screen
              name="index"
              options={{ title: 'Home' }}
            />
          </Tabs>
        </View>
        <BottomButtons />
      </View>
    </EmailVerificationGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  content: {
    flex: 1,
  },
});