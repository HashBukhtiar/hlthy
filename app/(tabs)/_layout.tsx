import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { display: 'none' }, // Hide the tab bar since we're using our custom bottom navigation
        headerShown: false, // Hide the header
        contentStyle: { backgroundColor: 'black' }
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home' }}
      />
    </Tabs>
  );
}
