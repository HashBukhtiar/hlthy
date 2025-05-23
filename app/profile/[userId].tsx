import React from 'react';
import { StyleSheet, View } from 'react-native';
import ProfileScreen from '@/screens/Profile';
import { Stack, useLocalSearchParams } from 'expo-router';

export default function UserProfilePage() {
  const { userId } = useLocalSearchParams<{ userId: string }>();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ProfileScreen userId={userId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});