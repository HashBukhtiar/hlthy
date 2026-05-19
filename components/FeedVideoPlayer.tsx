import React, { useState } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VideoPlayer from './VideoPlayer';

interface FeedVideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  style?: StyleProp<ViewStyle>;
}

export default function FeedVideoPlayer({ videoUrl, thumbnailUrl, style }: FeedVideoPlayerProps) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return <VideoPlayer videoUrl={videoUrl} style={style} />;
  }

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => setPlaying(true)} style={[styles.container, style]}>
      {thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallbackBg]} />
      )}
      <View style={styles.playButtonWrapper}>
        <View style={styles.playButton}>
          <Ionicons name="play" size={26} color="#FFF" style={styles.playIcon} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackBg: {
    backgroundColor: '#111',
  },
  playButtonWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  playIcon: {
    marginLeft: 3,
  },
});
