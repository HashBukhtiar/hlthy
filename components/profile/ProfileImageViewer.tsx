import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ENLARGED_SIZE = SCREEN_WIDTH * 0.85;

interface ProfileImageViewerProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
}

export const ProfileImageViewer: React.FC<ProfileImageViewerProps> = ({
  visible,
  imageUrl,
  onClose,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const translateYAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.3);
      translateYAnim.setValue(50);
    }
  }, [visible]);

  const handleClose = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

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

          {/* Profile Image */}
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.imageContainer,
                {
                  opacity: fadeAnim,
                  transform: [
                    { scale: scaleAnim },
                    { translateY: translateYAnim },
                  ],
                },
              ]}
            >
              <View style={styles.imageShadow}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.enlargedImage}
                  resizeMode="cover"
                />
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>

          {/* Close hint */}
          <Animated.View
            style={[
              styles.closeHint,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            {/* Optional: Add a subtle "Tap to close" text if desired */}
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
  closeHint: {
    position: 'absolute',
    bottom: 60,
  },
});
