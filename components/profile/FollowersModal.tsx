import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { collection, getDocs, doc, getDoc } from '@/features/infra/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';

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
  viewingOwnFollowers?: boolean;
}

type ExpandedSection = 'people' | 'hashtags';

export const FollowersModal: React.FC<FollowersModalProps> = ({
  visible,
  onClose,
  userId,
  type,
  onUserPress,
  viewingOwnFollowers = false,
}) => {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});
  const [followLoadingStates, setFollowLoadingStates] = useState<Record<string, boolean>>({});
  const [pendingRemoveUserId, setPendingRemoveUserId] = useState<string | null>(null);
  const [removingStates, setRemovingStates] = useState<Record<string, boolean>>({});
  const [unfollowSuggestionUserId, setUnfollowSuggestionUserId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>('people');

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

      // Fetch followed tags if this is the following modal and we're viewing current user's profile
      if (type === 'following' && userId === currentUser?.uid) {
        try {
          const tagsSnapshot = await getDocs(collection(db, 'users', userId, 'followedTags'));
          const tagNames = tagsSnapshot.docs.map(doc => doc.id);
          setTags(tagNames);
        } catch (err) {
          console.error('Error fetching followed tags:', err);
        }
      }

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
    setPendingRemoveUserId(null);
    setUnfollowSuggestionUserId(null);
    setExpandedSection('people');
    setTags([]);
    onClose();
  };

  const handleRemoveFollower = async (followerUserId: string) => {
    setRemovingStates(prev => ({ ...prev, [followerUserId]: true }));
    setPendingRemoveUserId(null);
    try {
      const removeFollowerFn = httpsCallable(getFunctions(), 'removeFollower');
      await removeFollowerFn({ followerUserId });
      setUsers(prev => prev.filter(u => u.id !== followerUserId));
    } catch (error) {
      console.error('Error removing follower:', error);
    } finally {
      setRemovingStates(prev => ({ ...prev, [followerUserId]: false }));
    }
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
      const followFunction = httpsCallable(getFunctions(), functionName);

      await followFunction({ targetUserId });

      setFollowingStates((prev) => ({
        ...prev,
        [targetUserId]: !isCurrentlyFollowing,
      }));

      // After unfollow, check if they follow us back and suggest removal
      if (isCurrentlyFollowing && currentUser) {
        const followerDoc = await getDoc(doc(db, 'users', currentUser.uid, 'followers', targetUserId));
        if (followerDoc.exists()) {
          setUnfollowSuggestionUserId(targetUserId);
        }
      }
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
    const isRemoving = removingStates[item.id];

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
        <View style={styles.rowActions}>
          {viewingOwnFollowers && type === 'followers' && (
            <TouchableOpacity
              style={[styles.removeButton, isRemoving && styles.removeButtonDisabled]}
              onPress={() => setPendingRemoveUserId(item.id)}
              disabled={isRemoving}
              activeOpacity={0.7}
            >
              {isRemoving ? (
                <ActivityIndicator size="small" color="#FF453A" />
              ) : (
                <Text style={styles.removeButtonText}>Remove</Text>
              )}
            </TouchableOpacity>
          )}
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
      </View>
    );
  };

  const renderTag = useCallback(
    ({ item: tagName }: { item: string }) => {
      return (
        <TouchableOpacity
          style={styles.tagItem}
          onPress={() => {
            handleClose();
            router.push(`/explore/tags/${tagName}`);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.tagIconContainer}>
            <Text style={styles.tagIconText}>#</Text>
          </View>
          <View style={styles.tagInfo}>
            <Text style={styles.tagName} numberOfLines={1}>
              {tagName}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      );
    },
    []
  );

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

            {/* Divider */}
            <View style={styles.divider} />

            {/* For "following" type with tags, show collapsable sections */}
            {type === 'following' && tags.length > 0 ? (
              <>
                {/* People Section */}
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => setExpandedSection(expandedSection === 'people' ? 'hashtags' : 'people')}
                  activeOpacity={0.7}
                >
                  <View style={styles.sectionHeaderContent}>
                    <Ionicons
                      name={expandedSection === 'people' ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="white"
                    />
                    <Text style={styles.sectionTitle}>
                      {users.length} {users.length === 1 ? 'PERSON' : 'PEOPLE'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {expandedSection === 'people' && (
                  <>
                    {/* Unfollow Suggestion Banner */}
                    {unfollowSuggestionUserId && (
                      <View style={styles.suggestionBanner}>
                        <View style={styles.suggestionTextContainer}>
                          <Text style={styles.suggestionTitle} numberOfLines={1}>
                            @{users.find(u => u.id === unfollowSuggestionUserId)?.username} still follows you
                          </Text>
                          <Text style={styles.suggestionSubtitle}>Remove them as a follower?</Text>
                        </View>
                        <View style={styles.suggestionActions}>
                          <TouchableOpacity
                            style={styles.suggestionIgnoreBtn}
                            onPress={() => setUnfollowSuggestionUserId(null)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="close" size={16} color="#888" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.suggestionRemoveBtn}
                            onPress={() => {
                              setPendingRemoveUserId(unfollowSuggestionUserId);
                              setUnfollowSuggestionUserId(null);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.suggestionRemoveTxt}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {loading ? (
                      <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={ACCENT_COLOR} />
                        <Text style={styles.loadingText}>Loading people...</Text>
                      </View>
                    ) : filteredUsers.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptySubtitle}>Not following anyone yet</Text>
                      </View>
                    ) : (
                      <FlatList
                        data={filteredUsers}
                        keyExtractor={(item) => item.id}
                        renderItem={renderUser}
                        contentContainerStyle={styles.listContent}
                        scrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        nestedScrollEnabled={true}
                      />
                    )}
                  </>
                )}

                {/* Hashtags Section */}
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => setExpandedSection(expandedSection === 'hashtags' ? 'people' : 'hashtags')}
                  activeOpacity={0.7}
                >
                  <View style={styles.sectionHeaderContent}>
                    <Ionicons
                      name={expandedSection === 'hashtags' ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="white"
                    />
                    <Text style={styles.sectionTitle}>
                      {tags.length} {tags.length === 1 ? 'HASHTAG' : 'HASHTAGS'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {expandedSection === 'hashtags' && (
                  <>
                    {loading ? (
                      <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={ACCENT_COLOR} />
                        <Text style={styles.loadingText}>Loading hashtags...</Text>
                      </View>
                    ) : tags.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptySubtitle}>Not following any hashtags yet</Text>
                      </View>
                    ) : (
                      <FlatList
                        data={tags}
                        keyExtractor={(item) => item}
                        renderItem={renderTag}
                        contentContainerStyle={styles.listContent}
                        scrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        nestedScrollEnabled={true}
                      />
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                {/* Default view for followers or following without tags */}
                {!loading && filteredUsers.length > 0 && (
                  <View style={styles.peopleCountContainer}>
                    <Text style={styles.peopleCountText}>
                      {filteredUsers.length} {filteredUsers.length === 1 ? 'PERSON' : 'PEOPLE'}
                    </Text>
                  </View>
                )}

                {/* Unfollow Suggestion Banner */}
                {unfollowSuggestionUserId && (
                  <View style={styles.suggestionBanner}>
                    <View style={styles.suggestionTextContainer}>
                      <Text style={styles.suggestionTitle} numberOfLines={1}>
                        @{users.find(u => u.id === unfollowSuggestionUserId)?.username} still follows you
                      </Text>
                      <Text style={styles.suggestionSubtitle}>Remove them as a follower?</Text>
                    </View>
                    <View style={styles.suggestionActions}>
                      <TouchableOpacity
                        style={styles.suggestionIgnoreBtn}
                        onPress={() => setUnfollowSuggestionUserId(null)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close" size={16} color="#888" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.suggestionRemoveBtn}
                        onPress={() => {
                          setPendingRemoveUserId(unfollowSuggestionUserId);
                          setUnfollowSuggestionUserId(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.suggestionRemoveTxt}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

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
                    showsVerticalScrollIndicator={true}
                    scrollEnabled={true}
                    nestedScrollEnabled={true}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />
                )}
              </>
            )}
          </BlurView>

          {/* Remove Follower Confirmation Dialog */}
          {pendingRemoveUserId && (
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmCard}>
                <Text style={styles.confirmTitle}>Remove Follower?</Text>
                <Text style={styles.confirmSubtitle} numberOfLines={1}>
                  @{users.find(u => u.id === pendingRemoveUserId)?.username} won't be notified.
                </Text>
                <View style={styles.confirmButtons}>
                  <TouchableOpacity
                    style={[styles.confirmBtn, styles.confirmCancelBtn]}
                    onPress={() => setPendingRemoveUserId(null)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={26} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmBtn, styles.confirmConfirmBtn]}
                    onPress={() => handleRemoveFollower(pendingRemoveUserId)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark" size={26} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
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
    height: SCREEN_HEIGHT * 0.9,
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
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.4)',
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
  removeButtonText: {
    color: '#FF453A',
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.25)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 4,
  },
  suggestionTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  suggestionTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionSubtitle: {
    color: '#888',
    fontSize: 12,
    marginTop: 1,
  },
  suggestionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionIgnoreBtn: {
    padding: 4,
  },
  suggestionRemoveBtn: {
    backgroundColor: 'rgba(255, 69, 58, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  suggestionRemoveTxt: {
    color: '#FF453A',
    fontSize: 13,
    fontWeight: '600',
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    zIndex: 10,
  },
  confirmCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 28,
    width: '75%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  confirmTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  confirmSubtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  confirmBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmCancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  confirmConfirmBtn: {
    backgroundColor: '#FF453A',
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
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  tagIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tagIconText: {
    color: ACCENT_COLOR,
    fontSize: 20,
    fontWeight: '700',
  },
  tagInfo: {
    flex: 1,
  },
  tagName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
