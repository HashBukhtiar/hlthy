import React, { useEffect, useState, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, Animated } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useVideoMute } from '@/context/VideoMuteContext';
import { useScreenIsFocused } from '@/hooks/useScreenIsFocused';

interface VideoPlayerProps {
  videoUrl: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export default function VideoPlayer({ videoUrl, style, onPress }: VideoPlayerProps) {
  const { isMuted, toggleMuted } = useVideoMute();
  const [isPaused, setIsPaused] = useState(false);
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const isFocused = useScreenIsFocused();

  const player = useVideoPlayer(videoUrl, p => {
    p.loop = true;
    p.muted = isMuted;
    p.play();
  });

  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted, player]);

  useEffect(() => {
    if (isFocused) {
      if (!isPaused) player.play();
    } else {
      player.pause();
    }
  }, [isFocused]);

  const flashIcon = () => {
    iconOpacity.setValue(1);
    Animated.timing(iconOpacity, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  const handleTap = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (isPaused) {
      player.play();
      setIsPaused(false);
    } else {
      player.pause();
      setIsPaused(true);
    }
    flashIcon();
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity activeOpacity={1} onPress={handleTap} style={StyleSheet.absoluteFill}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
      </TouchableOpacity>

      <Animated.View style={[styles.centerIcon, { opacity: iconOpacity }]} pointerEvents="none">
        <View style={styles.centerIconBg}>
          <Ionicons name={isPaused ? 'play' : 'pause'} size={28} color="#FFF" style={isPaused ? styles.playIconOffset : undefined} />
        </View>
      </Animated.View>

      <TouchableOpacity style={styles.muteButton} onPress={toggleMuted} activeOpacity={0.8}>
        <Ionicons
          name={isMuted ? 'volume-mute' : 'volume-high'}
          size={16}
          color="#FFF"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  centerIcon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  playIconOffset: {
    marginLeft: 3,
  },
  muteButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
