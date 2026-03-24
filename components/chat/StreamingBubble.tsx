/**
 * StreamingBubble — renders AI text token-by-token with a blinking cursor.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface StreamingBubbleProps {
  text: string;
}

export function StreamingBubble({ text }: StreamingBubbleProps) {
  const cursorOpacity = useSharedValue(1);

  useEffect(() => {
    cursorOpacity.value = withRepeat(
      withTiming(0, { duration: 500 }),
      -1,
      true,
    );
  }, [cursorOpacity]);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Text style={styles.text}>
          {text}
          <Animated.Text style={[styles.cursor, cursorStyle]}>|</Animated.Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    marginVertical: 4,
    marginHorizontal: 12,
  },
  bubble: {
    backgroundColor: '#1c1c1e',
    borderRadius: 18,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '85%',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  cursor: {
    color: '#FF2D55',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
