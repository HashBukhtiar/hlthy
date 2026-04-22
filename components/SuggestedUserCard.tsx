import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/firebaseConfig';
import { OptimizedImageLight } from '@/components/OptimizedImage';
import { SuggestedUser } from '@/features/social/domain/SuggestedUser';
import { useAuth } from '@/context/AuthContext';
import { ACCENT_COLOR } from '@/constants/Colors';

interface Props {
  user: SuggestedUser;
  onDismiss: (userId: string) => void;
}

export default function SuggestedUserCard({ user, onDismiss }: Props) {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [followState, setFollowState] = useState<'follow' | 'following' | 'requested'>('follow');
  const [followLoading, setFollowLoading] = useState(false);

  const handleFollowPress = async () => {
    if (!currentUser || followLoading) return;

    setFollowLoading(true);
    const functions = getFunctions(app, 'northamerica-northeast2');
    try {
      if (followState === 'follow') {
        const result = await httpsCallable<{ targetUserId: string }, { status: string }>(
          functions,
          'followUser'
        )({ targetUserId: user.userId });
        setFollowState(result.data.status === 'requested' ? 'requested' : 'following');
      } else if (followState === 'following') {
        await httpsCallable(functions, 'unfollowUser')({ targetUserId: user.userId });
        setFollowState('follow');
      }
    } catch {
      // silently revert — network error
    } finally {
      setFollowLoading(false);
    }
  };

  const handleCardPress = () => {
    router.push(`/profile/${user.userId}`);
  };

  const followLabel =
    followState === 'following' ? 'Following' : followState === 'requested' ? 'Requested' : 'Follow';

  const followStyle =
    followState === 'follow'
      ? styles.followBtn
      : styles.followingBtn;

  const followTextStyle =
    followState === 'follow'
      ? styles.followBtnText
      : styles.followingBtnText;

  return (
    <TouchableOpacity style={styles.card} onPress={handleCardPress} activeOpacity={0.8}>
      {/* Dismiss */}
      <TouchableOpacity style={styles.dismiss} onPress={() => onDismiss(user.userId)} hitSlop={8}>
        <Ionicons name="close" size={14} color="#8E8E93" />
      </TouchableOpacity>

      {/* Avatar */}
      <OptimizedImageLight
        thumbnailUrl={user.profileThumbnailUrl}
        originalUrl={user.profileImageUrl}
        style={styles.avatar}
      />

      {/* Name */}
      <Text style={styles.displayName} numberOfLines={1}>{user.displayName || user.username}</Text>
      <Text style={styles.username} numberOfLines={1}>@{user.username}</Text>

      {/* Follow button */}
      <TouchableOpacity
        style={[styles.followBtnBase, followStyle]}
        onPress={handleFollowPress}
        disabled={followLoading}
        activeOpacity={0.8}
      >
        {followLoading ? (
          <ActivityIndicator size="small" color={followState === 'follow' ? '#000' : '#FFF'} />
        ) : (
          <Text style={[styles.followBtnTextBase, followTextStyle]}>{followLabel}</Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 120,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  dismiss: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 8,
    marginTop: 8,
    backgroundColor: '#2C2C2E',
  },
  displayName: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
  username: {
    color: '#8E8E93',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 10,
  },
  followBtnBase: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  followBtn: {
    backgroundColor: ACCENT_COLOR,
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  followBtnTextBase: {
    fontSize: 12,
    fontWeight: '600',
  },
  followBtnText: {
    color: '#FFF',
  },
  followingBtnText: {
    color: '#8E8E93',
  },
});
