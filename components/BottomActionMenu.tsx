import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Pressable,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAG_THRESHOLD = 100;

export interface BottomActionMenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  color: string;
  backgroundColor: string;
  onPress: () => void;
  destructive?: boolean;
}

export interface BottomActionMenuProps {
  visible: boolean;
  onClose: () => void;
  items: BottomActionMenuItem[];
}

export default function BottomActionMenu({
  visible,
  onClose,
  items,
}: BottomActionMenuProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DRAG_THRESHOLD || gestureState.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      translateY.setValue(SCREEN_HEIGHT);
      opacity.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity }]}>
        <Pressable 
          style={styles.overlayPressable}
          onPress={handleClose}
        />
        <Animated.View 
          style={[
            styles.menuContainer,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer} {...panResponder.panHandlers}>
            <View style={styles.dragHandle} />
          </View>

          {Platform.OS === 'ios' ? (
            <BlurView intensity={100} tint="dark" style={styles.blurContainer}>
              <View style={styles.menuContent}>
                {items.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.menuItem,
                      index === items.length - 1 && styles.menuItemLast
                    ]}
                    onPress={() => {
                      item.onPress();
                      handleClose();
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={[styles.iconContainer, { backgroundColor: item.backgroundColor }]}>
                        <Ionicons 
                          name={item.icon} 
                          size={24} 
                          color={item.color} 
                        />
                      </View>
                      <View style={styles.menuItemTextContainer}>
                        <Text style={styles.menuItemText}>
                          {item.label}
                        </Text>
                        {item.sublabel && (
                          <Text style={styles.menuItemSubtext}>
                            {item.sublabel}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </BlurView>
          ) : (
            <View style={[styles.blurContainer, styles.androidContainer]}>
              <View style={styles.menuContent}>
                {items.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.menuItem,
                      index === items.length - 1 && styles.menuItemLast
                    ]}
                    onPress={() => {
                      item.onPress();
                      handleClose();
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={[styles.iconContainer, { backgroundColor: item.backgroundColor }]}>
                        <Ionicons 
                          name={item.icon} 
                          size={24} 
                          color={item.color} 
                        />
                      </View>
                      <View style={styles.menuItemTextContainer}>
                        <Text style={styles.menuItemText}>
                          {item.label}
                        </Text>
                        {item.sublabel && (
                          <Text style={styles.menuItemSubtext}>
                            {item.sublabel}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            activeOpacity={0.9}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'flex-end',
  },
  overlayPressable: {
    flex: 1,
  },
  menuContainer: {
    width: '100%',
    paddingHorizontal: 8,
    paddingBottom: Platform.OS === 'ios' ? 46 : 26,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(28, 28, 30, 0.98)' : '#1C1C1E',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  dragHandle: {
    width: 38,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#636366',
    opacity: 0.7,
  },
  blurContainer: {
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  androidContainer: {
    backgroundColor: 'rgba(28, 28, 30, 0.98)',
  },
  menuContent: {
    paddingVertical: 8,
    backgroundColor: Platform.OS === 'android' ? 'rgba(28, 28, 30, 0.98)' : 'transparent',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(58, 58, 60, 0.5)',
    minHeight: 72,
  },
  menuItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 20,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
      },
    }),
  },
  menuItemTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  menuItemText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  menuItemSubtext: {
    fontSize: 14,
    color: '#9A9A9F',
    lineHeight: 18,
    letterSpacing: -0.15,
  },
  cancelButton: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(28, 28, 30, 0.98)' : '#1C1C1E',
    borderRadius: 22,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A84FF',
    letterSpacing: -0.4,
  },
});
