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
const DRAG_THRESHOLD = 100; // Distance to drag before dismissing

export interface PostActionMenuProps {
  visible: boolean;
  onClose: () => void;
  isBookmarked: boolean;
  isFollowing: boolean;
  isOwnPost: boolean;
  isMilestone?: boolean;
  onToggleBookmark: () => void;
  onToggleFollow: () => void;
  onBlock: () => void;
  onReport: () => void;
}

export default function PostActionMenu({
  visible,
  onClose,
  isBookmarked,
  isFollowing,
  isOwnPost,
  isMilestone = false,
  onToggleBookmark,
  onToggleFollow,
  onBlock,
  onReport,
}: PostActionMenuProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Create pan responder for drag gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical drags
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow dragging down
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DRAG_THRESHOLD || gestureState.vy > 0.5) {
          // Dismiss if dragged far enough or fast enough
          handleClose();
        } else {
          // Snap back to position
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
      // Animate in
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
      // Reset to initial state
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
                {/* Bookmark Option - Only show for posts, not milestones */}
                {!isMilestone && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onToggleBookmark();
                      handleClose();
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 214, 10, 0.22)' }]}>
                        <Ionicons 
                          name={isBookmarked ? "bookmark" : "bookmark-outline"} 
                          size={24} 
                          color="#FFD60A" 
                        />
                      </View>
                      <View style={styles.menuItemTextContainer}>
                        <Text style={styles.menuItemText}>
                          {isBookmarked ? 'Remove Bookmark' : 'Save Post'}
                        </Text>
                        <Text style={styles.menuItemSubtext}>
                          {isBookmarked ? 'Remove from saved posts' : 'Save for later'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Follow/Unfollow Option - Only show if not own post */}
                {!isOwnPost && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      console.log('🟢 [PostActionMenu] Follow/Unfollow button pressed');
                      console.log('🟢 [PostActionMenu] isFollowing:', isFollowing);
                      console.log('🟢 [PostActionMenu] isOwnPost:', isOwnPost);
                      onToggleFollow();
                      handleClose();
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={[styles.iconContainer, { backgroundColor: isFollowing ? 'rgba(255, 69, 58, 0.22)' : 'rgba(48, 209, 88, 0.22)' }]}>
                        <Ionicons 
                          name={isFollowing ? "person-remove-outline" : "person-add-outline"} 
                          size={24} 
                          color={isFollowing ? "#FF453A" : "#30D158"} 
                        />
                      </View>
                      <View style={styles.menuItemTextContainer}>
                        <Text style={styles.menuItemText}>
                          {isFollowing ? 'Unfollow' : 'Follow'}
                        </Text>
                        <Text style={styles.menuItemSubtext}>
                          {isFollowing ? "Stop seeing posts from this user" : "See more from this user"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Block Option - Only show if not own post */}
                {!isOwnPost && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onBlock();
                      handleClose();
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 159, 10, 0.22)' }]}>
                        <Ionicons 
                          name="ban-outline" 
                          size={24} 
                          color="#FF9F0A" 
                        />
                      </View>
                      <View style={styles.menuItemTextContainer}>
                        <Text style={styles.menuItemText}>Block User</Text>
                        <Text style={styles.menuItemSubtext}>
                          You won't see their content
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Report Option - Only show if not own post */}
                {!isOwnPost && (
                  <TouchableOpacity
                    style={[styles.menuItem, styles.menuItemLast]}
                    onPress={() => {
                      onReport();
                      handleClose();
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 69, 58, 0.22)' }]}>
                        <Ionicons 
                          name="flag-outline" 
                          size={24} 
                          color="#FF453A" 
                        />
                      </View>
                      <View style={styles.menuItemTextContainer}>
                        <Text style={styles.menuItemText}>Report</Text>
                        <Text style={styles.menuItemSubtext}>
                          Report inappropriate content
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </BlurView>
          ) : (
            // Android fallback without blur
            <View style={[styles.blurContainer, styles.androidContainer]}>
              <View style={styles.menuContent}>
                {/* Bookmark Option - Only show for posts, not milestones */}
                {!isMilestone && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onToggleBookmark();
                      handleClose();
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 214, 10, 0.22)' }]}>
                        <Ionicons 
                          name={isBookmarked ? "bookmark" : "bookmark-outline"} 
                          size={24} 
                          color="#FFD60A" 
                        />
                      </View>
                      <View style={styles.menuItemTextContainer}>
                        <Text style={styles.menuItemText}>
                          {isBookmarked ? 'Remove Bookmark' : 'Save Post'}
                        </Text>
                        <Text style={styles.menuItemSubtext}>
                          {isBookmarked ? 'Remove from saved posts' : 'Save for later'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Follow/Unfollow Option */}
                {!isOwnPost && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onToggleFollow();
                      handleClose();
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={[styles.iconContainer, { backgroundColor: isFollowing ? 'rgba(255, 69, 58, 0.22)' : 'rgba(48, 209, 88, 0.22)' }]}>
                        <Ionicons 
                          name={isFollowing ? "person-remove-outline" : "person-add-outline"} 
                          size={24} 
                          color={isFollowing ? "#FF453A" : "#30D158"} 
                        />
                      </View>
                      <View style={styles.menuItemTextContainer}>
                        <Text style={styles.menuItemText}>
                          {isFollowing ? 'Unfollow' : 'Follow'}
                        </Text>
                        <Text style={styles.menuItemSubtext}>
                          {isFollowing ? "Stop seeing posts from this user" : "See more from this user"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Block Option */}
                {!isOwnPost && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onBlock();
                      handleClose();
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 159, 10, 0.22)' }]}>
                        <Ionicons 
                          name="ban-outline" 
                          size={24} 
                          color="#FF9F0A" 
                        />
                      </View>
                      <View style={styles.menuItemTextContainer}>
                        <Text style={styles.menuItemText}>Block User</Text>
                        <Text style={styles.menuItemSubtext}>
                          You won't see their content
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Report Option */}
                {!isOwnPost && (
                  <TouchableOpacity
                    style={[styles.menuItem, styles.menuItemLast]}
                    onPress={() => {
                      onReport();
                      handleClose();
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 69, 58, 0.22)' }]}>
                        <Ionicons 
                          name="flag-outline" 
                          size={24} 
                          color="#FF453A" 
                        />
                      </View>
                      <View style={styles.menuItemTextContainer}>
                        <Text style={styles.menuItemText}>Report</Text>
                        <Text style={styles.menuItemSubtext}>
                          Report inappropriate content
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
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
