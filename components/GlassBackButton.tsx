import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function GlassBackButton() {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
      activeOpacity={0.7}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={40} tint="dark" style={styles.blur}>
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </BlurView>
      ) : (
        <Ionicons name="chevron-back" size={20} color="#FFF" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.12)' : undefined,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blur: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
