import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ENLARGED_SIZE = SCREEN_WIDTH * 0.85;
const ORIGINAL_SIZE = 90; // Original profile image size

export interface ImagePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ProfileImageViewerProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
  originPosition: ImagePosition | null;
}

export const ProfileImageViewer: React.FC<ProfileImageViewerProps> = ({
  visible,
  imageUrl,
  onClose,
  originPosition,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const animationProgress = useRef(new Animated.Value(0)).current;

  // Calculate center position for the enlarged image
  const centerX = SCREEN_WIDTH / 2;
  const centerY = SCREEN_HEIGHT / 2;

  // Starting position (center of the original image)
  const startX = originPosition ? originPosition.x + originPosition.width / 2 : 16 + ORIGINAL_SIZE / 2;
  const startY = originPosition ? originPosition.y + originPosition.height / 2 : 150 + ORIGINAL_SIZE / 2;
  const startSize = originPosition?.width ?? ORIGINAL_SIZE;

  // Calculate scale factor (how much smaller the original is compared to enlarged)
  const scaleFactor = startSize / ENLARGED_SIZE;

  // Calculate translate offsets (from center of screen to center of original image position)
  const translateXOffset = startX - centerX;
  const translateYOffset = startY - centerY;

  useEffect(() => {
    if (visible) {
      // Reset and animate in
      animationProgress.setValue(0);
      fadeAnim.setValue(0);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.spring(animationProgress, {
          toValue: 1,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    // Animate back to original position
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(animationProgress, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // Interpolate scale from small (original size) to full size
  const scale = animationProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [scaleFactor, 1],
  });

  // Interpolate position from original location to center
  const translateX = animationProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [translateXOffset, 0],
  });

  const translateY = animationProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [translateYOffset, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.container}>
          {/* Dimmed background with blur */}
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            {Platform.OS === 'ios' ? (
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.androidBackdrop]} />
            )}
          </Animated.View>

          {/* Profile Image - animates from original position using transforms */}
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.imageContainer,
                {
                  transform: [
                    { translateX },
                    { translateY },
                    { scale },
                  ],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.imageShadow,
                  {
                    opacity: animationProgress,
                  },
                ]}
              >
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.enlargedImage}
                  resizeMode="cover"
                />
              </Animated.View>
            </Animated.View>
          </TouchableWithoutFeedback>

          {/* Close Button */}
          <Animated.View
            style={[
              styles.closeButtonContainer,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {Platform.OS === 'ios' ? (
                <BlurView intensity={40} tint="dark" style={styles.closeButtonBlur}>
                  <Ionicons name="close" size={22} color="rgba(255, 255, 255, 0.9)" />
                </BlurView>
              ) : (
                <View style={styles.closeButtonAndroid}>
                  <Ionicons name="close" size={22} color="rgba(255, 255, 255, 0.9)" />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  androidBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
  },
  closeButtonContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  closeButtonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButtonAndroid: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageShadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 25,
  },
  enlargedImage: {
    width: ENLARGED_SIZE,
    height: ENLARGED_SIZE,
    borderRadius: ENLARGED_SIZE / 2,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: '#1C1C1E',
  },
});
