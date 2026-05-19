import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useVideoMute } from '@/context/VideoMuteContext';

interface VideoPlayerProps {
  videoUrl: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export default function VideoPlayer({ videoUrl, style, onPress }: VideoPlayerProps) {
  const { isMuted, toggleMuted } = useVideoMute();

  const player = useVideoPlayer(videoUrl, p => {
    p.loop = true;
    p.muted = isMuted;
    p.play();
  });

  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted, player]);

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity activeOpacity={1} onPress={onPress} style={StyleSheet.absoluteFill}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
      </TouchableOpacity>

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
