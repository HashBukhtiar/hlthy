import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import EmailVerificationGuard from '@/components/EmailVerificationGuard';

console.log('[TabLayout] Module loaded');

export default function TabLayout() {
  console.log('[TabLayout] Component rendering');
  
  try {
    const colorScheme = useColorScheme();
    console.log('[TabLayout] colorScheme:', colorScheme);

    return (
      <EmailVerificationGuard>
        <View style={{ flex: 1, backgroundColor: 'black' }}>
          <Tabs
            screenOptions={{
              tabBarStyle: { display: 'none' },
              headerShown: false,
            }}>
            <Tabs.Screen
              name="index"
              options={{ title: 'Home' }}
            />
          </Tabs>
        </View>
      </EmailVerificationGuard>
    );
  } catch (error) {
    console.error('[TabLayout] Error:', error);
    return (
      <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white' }}>Tab Layout Error</Text>
      </View>
    );
  }
}
