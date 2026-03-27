import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT_COLOR } from '@/constants/Colors';

// NativeTabs is only used on iOS — on Android it causes a fatal Fabric view hierarchy crash
// that destroys the entire React Native instance after login navigation.
let NativeTabs: any, Icon: any, Label: any;
if (Platform.OS === 'ios') {
  const nativeTabs = require('expo-router/unstable-native-tabs');
  NativeTabs = nativeTabs.NativeTabs;
  Icon = nativeTabs.Icon;
  Label = nativeTabs.Label;
}

export default function TabLayout() {
  if (Platform.OS === 'ios' && NativeTabs) {
    return (
      <NativeTabs
        minimizeBehavior="onScrollDown"
        disableTransparentOnScrollEdge={false}
        tintColor={ACCENT_COLOR}
      >
        <NativeTabs.Trigger name="index">
          <Label>Home</Label>
          <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="ai">
          <Label>AI</Label>
          <Icon sf={{ default: 'sparkles', selected: 'sparkles' }} />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="workouts">
          <Label>Workouts</Label>
          <Icon sf={{ default: 'flame', selected: 'flame.fill' }} />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="profile">
          <Label>Profile</Label>
          <Icon sf={{ default: 'person', selected: 'person.fill' }} />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="post" role="search">
          <Label>Post</Label>
          <Icon sf={{ default: 'plus.circle', selected: 'plus.circle.fill' }} />
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  // Android: use standard Tabs from expo-router (avoids Fabric view hierarchy crash)
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACCENT_COLOR,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: 'rgba(255,255,255,0.1)',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workouts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flame" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'Post',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
