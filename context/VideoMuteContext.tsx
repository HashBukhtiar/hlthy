import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MUTE_KEY = '@video_muted';

interface VideoMuteContextType {
  isMuted: boolean;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
}

const VideoMuteContext = createContext<VideoMuteContextType>({
  isMuted: false,
  setMuted: () => {},
  toggleMuted: () => {},
});

export function VideoMuteProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(MUTE_KEY).then(val => {
      if (val !== null) setIsMuted(val === 'true');
    });
  }, []);

  const setMuted = (muted: boolean) => {
    setIsMuted(muted);
    AsyncStorage.setItem(MUTE_KEY, String(muted));
  };

  const toggleMuted = () => setMuted(!isMuted);

  return (
    <VideoMuteContext.Provider value={{ isMuted, setMuted, toggleMuted }}>
      {children}
    </VideoMuteContext.Provider>
  );
}

export const useVideoMute = () => useContext(VideoMuteContext);
