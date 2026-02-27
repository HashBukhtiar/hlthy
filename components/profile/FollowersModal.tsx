import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Animated,
  Platform,
  Dimensions,
  Pressable,
  PanResponder,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { OptimizedImageLight } from '@/components/OptimizedImage';
import { ACCENT_COLOR } from '@/constants/Colors';
import { db } from '@/firebaseConfig';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface User {
  id: string;
  username: string;
  displayName: string;
  profileImageUrl?: string;
  profileThumbnailUrl?: string;
  bio?: string;
  verified?: boolean;
  isFollowing?: boolean;
}

interface FollowersModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
  onUserPress: (userId: string) => void;
}

export const FollowersModal: React.FC<FollowersModalProps> = ({
  visible,
  onClose,
  userId,
  type,
  onUserPress,
}) => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});
  const [followLoadingStates, setFollowLoadingStates] = useState<Record<string, boolean>>({});

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return gestureState.dy > 5;
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            slideAnim.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 150 || gestureState.vy > 0.5) {
            handleClose();
          } else {
            Animated.spring(slideAnim, {
              toValue: 0,
              useNativeDriver: true,
              tension: 65,
              friction: 10,
            }).start();
          }
        },
      }),
    [slideAnim]
  );

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (visible && userId) {
      fetchUsers();
    }
  }, [visible, userId, type]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const collectionName = type === 'followers' ? 'followers' : 'following';
      const usersSnapshot = await getDocs(collection(db, 'users', userId, collectionName));

      const usersPromises = usersSnapshot.docs.map(async (userDoc) => {
        const userSnapshot = await getDoc(doc(db, 'users', userDoc.id));
        if (userSnapshot.exists()) {
          return {
            id: userDoc.id,
            ...userSnapshot.data(),
          } as User;
        }
        return null;
      });

      const usersData = (await Promise.all(usersPromises)).filter(
        (user): user is User => user !== null
      );
      setUsers(usersData);

      // Check following status for each user
      if (currentUser) {
        const followingStatusMap: Record<string, boolean> = {};
        await Promise.all(
          usersData.map(async (user) => {
            if (user.id !== currentUser.uid) {
              const followingDoc = await getDoc(
                doc(db, 'users', currentUser.uid, 'following', user.id)
              );
              followingStatusMap[user.id] = followingDoc.exists();
            }
          })
        );
        setFollowingStates(followingStatusMap);
      }
    } catch (err) {
      console.error(`Error fetching ${type}:`, err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.username?.toLowerCase().includes(query) ||
        user.displayName?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  const handleUserPress = (pressedUserId: string) => {
    handleClose();
    onUserPress(pressedUserId);
  };

  const handleFollowToggle = async (targetUserId: string) => {
    if (!currentUser || targetUserId === currentUser.uid) return;

    setFollowLoadingStates((prev) => ({ ...prev, [targetUserId]: true }));

    try {
      const isCurrentlyFollowing = followingStates[targetUserId];
      const functionName = isCurrentlyFollowing ? 'unfollowUser' : 'followUser';
      const functions = getFunctions();
      const followFunction = httpsCallable(functions, functionName);

      await followFunction({ targetUserId });

      setFollowingStates((prev) => ({
        ...prev,
        [targetUserId]: !isCurrentlyFollowing,
      }));
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoadingStates((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const renderUser = ({ item }: { item: User }) => {
    const isOwnProfile = currentUser?.uid === item.id;
    const isFollowing = followingStates[item.id];
    const isFollowLoading = followLoadingStates[item.id];

    return (
      <View style={styles.userItem}>
        <TouchableOpacity
          style={styles.userContent}
          onPress={() => handleUserPress(item.id)}
          activeOpacity={0.7}
        >
          <OptimizedImageLight
            thumbnailUrl={item.profileThumbnailUrl}
            originalUrl={item.profileImageUrl}
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={styles.displayName} numberOfLines={1}>
                {item.displayName || item.username}
              </Text>
              {item.verified && (
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={ACCENT_COLOR}
                  style={styles.verifiedBadge}
                />
              )}
            </View>
            <Text style={styles.username} numberOfLines={1}>
              @{item.username}
            </Text>
          </View>
        </TouchableOpacity>
        {!isOwnProfile && (
          <TouchableOpacity
            style={[
              styles.followButton,
              isFollowing && styles.followingButton,
            ]}
            onPress={() => handleFollowToggle(item.id)}
            disabled={isFollowLoading}
            activeOpacity={0.7}
          >
            {isFollowLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View style={styles.followButtonContent}>
                {!isFollowing && (
                  <Ionicons name="person-add" size={14} color="#fff" style={styles.followIcon} />
                )}
                <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <BlurView intensity={95} tint="dark" style={styles.blurContainer}>
            {/* Header - Swipeable */}
            <View style={styles.header} {...panResponder.panHandlers}>
              <View style={styles.handleBar} />
              <View style={styles.headerContent}>
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>
                    {type === 'followers' ? 'Followers' : 'Following'}
                  </Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{users.length}</Text>
                </View>
                </View>
                {Platform.OS === 'ios' ? (
                  <TouchableOpacity
                    style={styles.closeButtonIOS}
                    onPress={handleClose}
                    activeOpacity={0.6}
                  >
                    <BlurView intensity={20} tint="light" style={styles.closeButtonBlur}>
                      <Ionicons name="close" size={18} color="#fff" />
                    </BlurView>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.closeButtonAndroid}
                    onPress={handleClose}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={22} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color="#888" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search..."
                  placeholderTextColor="#666"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={styles.clearButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={18} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Divider and People Count */}
            <View style={styles.divider} />
            {!loading && filteredUsers.length > 0 && (
              <View style={styles.peopleCountContainer}>
                <Text style={styles.peopleCountText}>
                  {filteredUsers.length} {filteredUsers.length === 1 ? 'PERSON' : 'PEOPLE'}
                </Text>
              </View>
            )}

            {/* Content */}
            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={ACCENT_COLOR} />
                <Text style={styles.loadingText}>Loading {type}...</Text>
              </View>
            ) : filteredUsers.length === 0 ? (
              <View style={styles.centerContainer}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons
                    name={searchQuery ? 'search-outline' : 'people-outline'}
                    size={48}
                    color="#444"
                  />
                </View>
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'No results found' : `No ${type} yet`}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? 'Try adjusting your search'
                    : type === 'followers'
                    ? 'People who follow this profile will appear here'
                    : 'Accounts this profile follows will appear here'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item.id}
                renderItem={renderUser}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
          </BlurView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  blurContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  header: {
    paddingTop: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  closeButtonIOS: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
  },
  closeButtonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  closeButtonAndroid: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
  },
  peopleCountContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  peopleCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  userContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#222',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  displayName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  username: {
    color: '#888',
    fontSize: 13,
  },
  bio: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginLeft: 80,
  },
  followButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: ACCENT_COLOR,
    width: 100,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  followButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  followButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  followingButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  followIcon: {
    marginRight: -1,
  },
});
