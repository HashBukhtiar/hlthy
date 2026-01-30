import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import {
  GestureHandlerRootView,
  PinchGestureHandler,
  PanGestureHandler,
  TapGestureHandler,
  State,
  PinchGestureHandlerStateChangeEvent,
  PanGestureHandlerStateChangeEvent,
  TapGestureHandlerStateChangeEvent,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';

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

  // Zoom and pan state
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const [isZoomed, setIsZoomed] = useState(false);
  
  // Base values for gestures
  const baseScale = useRef(1);
  const baseTranslateX = useRef(0);
  const baseTranslateY = useRef(0);
  const lastScale = useRef(1);

  // Gesture refs
  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const doubleTapRef = useRef(null);

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

  // Reset zoom when modal closes
  useEffect(() => {
    if (!visible) {
      scale.setValue(1);
      translateX.setValue(0);
      translateY.setValue(0);
      baseScale.current = 1;
      baseTranslateX.current = 0;
      baseTranslateY.current = 0;
      lastScale.current = 1;
      setIsZoomed(false);
    }
  }, [visible]);

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

  const resetZoom = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 10,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        friction: 10,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 10,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
    baseScale.current = 1;
    baseTranslateX.current = 0;
    baseTranslateY.current = 0;
    lastScale.current = 1;
    setIsZoomed(false);
  };

  const handleClose = () => {
    // Reset zoom first
    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
    setIsZoomed(false);
    
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

  const onDoubleTap = (event: TapGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      if (isZoomed) {
        resetZoom();
      } else {
        // Zoom to 2.5x
        const targetScale = 2.5;
        Animated.spring(scale, {
          toValue: targetScale,
          friction: 10,
          tension: 80,
          useNativeDriver: true,
        }).start();
        baseScale.current = targetScale;
        lastScale.current = targetScale;
        setIsZoomed(true);
      }
    }
  };

  const onPinchGestureEvent = Animated.event(
    [{ nativeEvent: { scale: scale } }],
    { useNativeDriver: true }
  );

  const onPinchHandlerStateChange = (event: PinchGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      let newScale = baseScale.current * event.nativeEvent.scale;
      
      // Clamp scale between 1 and 4
      if (newScale < 1) {
        newScale = 1;
        resetZoom();
        return;
      } else if (newScale > 4) {
        newScale = 4;
      }
      
      baseScale.current = newScale;
      lastScale.current = newScale;
      scale.setValue(newScale);
      setIsZoomed(newScale > 1);
    }
  };

  const onPanGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    if (lastScale.current > 1) {
      const maxTranslate = (ENLARGED_SIZE * (lastScale.current - 1)) / 2;
      
      let newTranslateX = baseTranslateX.current + event.nativeEvent.translationX;
      let newTranslateY = baseTranslateY.current + event.nativeEvent.translationY;
      
      // Clamp translation
      newTranslateX = Math.max(-maxTranslate, Math.min(maxTranslate, newTranslateX));
      newTranslateY = Math.max(-maxTranslate, Math.min(maxTranslate, newTranslateY));
      
      translateX.setValue(newTranslateX);
      translateY.setValue(newTranslateY);
    }
  };

  const onPanHandlerStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const maxTranslate = (ENLARGED_SIZE * (lastScale.current - 1)) / 2;
      
      let newTranslateX = baseTranslateX.current + event.nativeEvent.translationX;
      let newTranslateY = baseTranslateY.current + event.nativeEvent.translationY;
      
      // Clamp translation
      newTranslateX = Math.max(-maxTranslate, Math.min(maxTranslate, newTranslateX));
      newTranslateY = Math.max(-maxTranslate, Math.min(maxTranslate, newTranslateY));
      
      baseTranslateX.current = newTranslateX;
      baseTranslateY.current = newTranslateY;
    }
  };

  // Interpolate entry animation scale
  const entryScale = animationProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [scaleFactor, 1],
  });

  // Interpolate position from original location to center
  const entryTranslateX = animationProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [translateXOffset, 0],
  });

  const entryTranslateY = animationProgress.interpolate({
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
      <GestureHandlerRootView style={styles.gestureRoot}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.container}>
          {/* Dimmed background with blur - tappable to close */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={isZoomed ? undefined : handleClose}
          >
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
          </Pressable>

          {/* Profile Image - with gestures */}
          <PanGestureHandler
              ref={panRef}
              onGestureEvent={onPanGestureEvent}
              onHandlerStateChange={onPanHandlerStateChange}
              enabled={isZoomed}
              simultaneousHandlers={pinchRef}
              minPointers={1}
              maxPointers={2}
            >
              <Animated.View>
                <PinchGestureHandler
                  ref={pinchRef}
                  onGestureEvent={onPinchGestureEvent}
                  onHandlerStateChange={onPinchHandlerStateChange}
                  simultaneousHandlers={panRef}
                >
                  <Animated.View>
                    <TapGestureHandler
                      ref={doubleTapRef}
                      onHandlerStateChange={onDoubleTap}
                      numberOfTaps={2}
                    >
                      <Animated.View
                        style={[
                          styles.imageContainer,
                          {
                            transform: [
                              { translateX: entryTranslateX },
                              { translateY: entryTranslateY },
                              { scale: entryScale },
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
                          <Animated.Image
                            source={{ uri: imageUrl }}
                            style={[
                              styles.enlargedImage,
                              {
                                transform: [
                                  { scale },
                                  { translateX },
                                  { translateY },
                                ],
                              },
                            ]}
                            resizeMode="cover"
                          />
                        </Animated.View>
                      </Animated.View>
                    </TapGestureHandler>
                  </Animated.View>
                </PinchGestureHandler>
              </Animated.View>
            </PanGestureHandler>

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

            {/* Zoom indicator */}
            {isZoomed && (
              <Animated.View
                style={[
                  styles.zoomIndicator,
                  { opacity: fadeAnim },
                ]}
              >
                <TouchableOpacity
                  onPress={resetZoom}
                  style={styles.zoomResetButton}
                  activeOpacity={0.8}
                >
                  {Platform.OS === 'ios' ? (
                    <BlurView intensity={40} tint="dark" style={styles.zoomResetBlur}>
                      <Ionicons name="contract-outline" size={18} color="rgba(255, 255, 255, 0.9)" />
                    </BlurView>
                  ) : (
                    <View style={styles.zoomResetAndroid}>
                      <Ionicons name="contract-outline" size={18} color="rgba(255, 255, 255, 0.9)" />
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
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
  zoomIndicator: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    alignSelf: 'center',
  },
  zoomResetButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  zoomResetBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  zoomResetAndroid: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 22,
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
