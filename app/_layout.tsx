import 'react-native-get-random-values';
import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomButtons from '@/components/BottomButtons';
import { AuthProvider } from '@/context/AuthContext';
import { GlobalNetworkMonitor } from '@/components/GlobalNetworkMonitor';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SafeAreaProvider>
          <View style={styles.container}>
            <GlobalNetworkMonitor />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: 'black' },
                animation: Platform.OS === 'android' ? 'fade' : 'none',
              }}
            >
            {/* Main tab screens with disabled swipe gestures */}
            <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
            <Stack.Screen name="post" options={{ gestureEnabled: false }} />
            <Stack.Screen name="dms" options={{ gestureEnabled: false }} />
            <Stack.Screen name="workouts" options={{ gestureEnabled: false }} />
            <Stack.Screen name="profile" options={{ gestureEnabled: false }} />
            
            {/* Screens with swipe back enabled */}
            <Stack.Screen name="pulse" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
            <Stack.Screen name="explore" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
            <Stack.Screen name="settings" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
            
            {/* Other screens */}
            <Stack.Screen name="signup" />
            <Stack.Screen name="select-archetype" />
            <Stack.Screen name="create-workout" options={{ animation: 'slide_from_bottom', gestureEnabled: true }} />
            <Stack.Screen name="view-workout/[id]" options={{ animation: 'fade_from_bottom', gestureEnabled: true }} />
            <Stack.Screen name="view-post/[id]" options={{ animation: 'fade_from_bottom', gestureEnabled: true }} />
            <Stack.Screen name="view-milestone/[id]" options={{ animation: 'fade_from_bottom', gestureEnabled: true }} />
            <Stack.Screen name="workout-plan" />
            <Stack.Screen name="diet-plan" />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
          
          {/* Bottom navigation that persists across route changes but hides on specific screens */}
          <BottomButtons />
        </View>
      </SafeAreaProvider>
    </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
