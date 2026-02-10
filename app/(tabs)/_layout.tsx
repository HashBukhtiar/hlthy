import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { NativeTabs, Icon, Label, VectorIcon } from 'expo-router/unstable-native-tabs';
import { Ionicons } from '@expo/vector-icons';
import EmailVerificationGuard from '@/components/EmailVerificationGuard';
import { ACCENT_COLOR } from '@/constants/Colors';

console.log('[TabLayout] Module loaded');

export default function TabLayout() {
  console.log('[TabLayout] Component rendering with NativeTabs');

  return (
    <EmailVerificationGuard>
      <NativeTabs
        // iOS 26+ Liquid Glass styling
        minimizeBehavior="onScrollDown"
        disableTransparentOnScrollEdge={false}
        // Tab bar styling - use accent color for selected items
        tintColor={ACCENT_COLOR}
      >
        {/* Home Tab */}
        <NativeTabs.Trigger name="index">
          <Label>Home</Label>
          {Platform.select({
            ios: <Icon sf={{ default: 'house', selected: 'house.fill' }} />,
            android: <Icon src={<VectorIcon family={Ionicons} name="home" />} />,
          })}
        </NativeTabs.Trigger>

        {/* AI Chat Tab */}
        <NativeTabs.Trigger name="ai">
          <Label>AI</Label>
          {Platform.select({
            ios: <Icon sf={{ default: 'sparkles', selected: 'sparkles' }} />,
            android: <Icon src={<VectorIcon family={Ionicons} name="sparkles" />} />,
          })}
        </NativeTabs.Trigger>

        {/* Workouts Tab */}
        <NativeTabs.Trigger name="workouts">
          <Label>Workouts</Label>
          {Platform.select({
            ios: <Icon sf={{ default: 'flame', selected: 'flame.fill' }} />,
            android: <Icon src={<VectorIcon family={Ionicons} name="flame" />} />,
          })}
        </NativeTabs.Trigger>

        {/* Profile Tab */}
        <NativeTabs.Trigger name="profile">
          <Label>Profile</Label>
          {Platform.select({
            ios: <Icon sf={{ default: 'person', selected: 'person.fill' }} />,
            android: <Icon src={<VectorIcon family={Ionicons} name="person" />} />,
          })}
        </NativeTabs.Trigger>

        {/* Post Tab - Separate action on the right with search role for iOS 26+ separation */}
        <NativeTabs.Trigger name="post" role="search">
          <Label>Post</Label>
          {Platform.select({
            ios: <Icon sf={{ default: 'plus.circle', selected: 'plus.circle.fill' }} />,
            android: <Icon src={<VectorIcon family={Ionicons} name="add-circle" />} />,
          })}
        </NativeTabs.Trigger>
      </NativeTabs>
    </EmailVerificationGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});