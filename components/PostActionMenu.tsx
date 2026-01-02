import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

export interface PostActionMenuProps {
  visible: boolean;
  onClose: () => void;
  isBookmarked: boolean;
  isFollowing: boolean;
  isOwnPost: boolean;
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
  onToggleBookmark,
  onToggleFollow,
  onBlock,
  onReport,
}: PostActionMenuProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable 
        style={styles.overlay}
        onPress={onClose}
      >
        <View style={styles.menuContainer}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={95} tint="dark" style={styles.blurContainer}>
              <View style={styles.menuContent}>
                {/* Bookmark Option */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    onToggleBookmark();
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemContent}>
                    <View style={[styles.iconContainer, { backgroundColor: '#FFD60A15' }]}>
                      <Ionicons 
                        name={isBookmarked ? "bookmark" : "bookmark-outline"} 
                        size={20} 
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
                  <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                </TouchableOpacity>

                {/* Follow/Unfollow Option - Only show if not own post */}
                {!isOwnPost && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onToggleFollow();
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={[styles.iconContainer, { backgroundColor: isFollowing ? '#FF453A15' : '#30D15815' }]}>
                        <Ionicons 
                          name={isFollowing ? "person-remove-outline" : "person-add-outline"} 
                          size={20} 
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
                    <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                  </TouchableOpacity>
                )}

                {/* Block Option - Only show if not own post */}
                {!isOwnPost && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onBlock();
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={[styles.iconContainer, { backgroundColor: '#FF9F0A15' }]}>
                        <Ionicons 
                          name="ban-outline" 
                          size={20} 
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
                    <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                  </TouchableOpacity>
                )}

                {/* Report Option - Only show if not own post */}
                {!isOwnPost && (
                  <TouchableOpacity
                    style={[styles.menuItem, styles.menuItemLast]}
                    onPress={() => {
                      onReport();
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={[styles.iconContainer, { backgroundColor: '#FF453A15' }]}>
                        <Ionicons 
                          name="flag-outline" 
                          size={20} 
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
                    <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                  </TouchableOpacity>
                )}
              </View>
            </BlurView>
          ) : (
            // Android fallback without blur
            <View style={[styles.blurContainer, styles.androidContainer]}>
              <View style={styles.menuContent}>
                {/* Same menu items for Android */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    onToggleBookmark();
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemContent}>
                    <View style={[styles.iconContainer, { backgroundColor: '#FFD60A15' }]}>
                      <Ionicons 
                        name={isBookmarked ? "bookmark" : "bookmark-outline"} 
                        size={20} 
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
                  <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                </TouchableOpacity>

                {!isOwnPost && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onToggleFollow();
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={[styles.iconContainer, { backgroundColor: isFollowing ? '#FF453A15' : '#30D15815' }]}>
                        <Ionicons 
                          name={isFollowing ? "person-remove-outline" : "person-add-outline"} 
                          size={20} 
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
                    <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                  </TouchableOpacity>
                )}

                {!isOwnPost && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onBlock();
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={[styles.iconContainer, { backgroundColor: '#FF9F0A15' }]}>
                        <Ionicons 
                          name="ban-outline" 
                          size={20} 
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
                    <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                  </TouchableOpacity>
                )}

                {!isOwnPost && (
                  <TouchableOpacity
                    style={[styles.menuItem, styles.menuItemLast]}
                    onPress={() => {
                      onReport();
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={[styles.iconContainer, { backgroundColor: '#FF453A15' }]}>
                        <Ionicons 
                          name="flag-outline" 
                          size={20} 
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
                    <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  menuContainer: {
    width: '100%',
  },
  blurContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  androidContainer: {
    backgroundColor: '#1C1C1E',
  },
  menuContent: {
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#3A3A3C',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemTextContainer: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  menuItemSubtext: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 16,
  },
  cancelButton: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(28, 28, 30, 0.95)' : '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0A84FF',
  },
});
