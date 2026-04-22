import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebaseConfig';
import { collection, getDocs, query, where } from '@/features/infra/firestore';
import { getOptimalImageUrl } from '@/utils/imageUtils';
import { MentionRepository } from '@/features/mentions/infra/mentionRepository';

interface MentionBlockedUser {
  id: string;
  username: string;
  displayName: string;
  profileImageUrl?: string;
  profileThumbnailUrl?: string;
}

export default function MentionBlockedUsers() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<MentionBlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);

  const fetchMentionBlockedUsers = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const blocksSnap = await getDocs(
        collection(db, 'users', currentUser.uid, 'mentionBlocks')
      );

      if (blocksSnap.empty) {
        setBlockedUsers([]);
        return;
      }

      const blockedIds = blocksSnap.docs.map(d => d.id);

      // Fetch user profiles in chunks of 30 (Firestore 'in' limit)
      const users: MentionBlockedUser[] = [];
      for (let i = 0; i < blockedIds.length; i += 30) {
        const chunk = blockedIds.slice(i, i + 30);
        const q = query(collection(db, 'users'), where('__name__', 'in', chunk));
        const snap = await getDocs(q);
        snap.forEach(doc => {
          const data = doc.data();
          users.push({
            id: doc.id,
            username: data.username || 'Unknown',
            displayName: data.displayName || 'Unknown User',
            profileImageUrl: data.profileImageUrl,
            profileThumbnailUrl: data.profileThumbnailUrl,
          });
        });
      }

      setBlockedUsers(users);
    } catch (error) {
      console.error('Error fetching mention-blocked users:', error);
      Alert.alert('Error', 'Failed to load blocked users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useFocusEffect(fetchMentionBlockedUsers);

  const handleUnblock = (userId: string, username: string) => {
    Alert.alert(
      'Allow mentions',
      `Allow @${username} to mention you again?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Allow',
          onPress: async () => {
            setUnblockingUserId(userId);
            try {
              await MentionRepository.unblockMentionUser(userId);
              setBlockedUsers(prev => prev.filter(u => u.id !== userId));
            } catch (error) {
              console.error('Error unblocking mention user:', error);
              Alert.alert('Error', 'Failed to update. Please try again.');
            } finally {
              setUnblockingUserId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: MentionBlockedUser }) => (
    <View style={styles.userCard}>
      <Image
        source={{ uri: getOptimalImageUrl(item.profileThumbnailUrl, item.profileImageUrl) }}
        style={styles.profileImage}
      />
      <View style={styles.userInfo}>
        <Text style={styles.displayName}>{item.displayName}</Text>
        <Text style={styles.username}>@{item.username}</Text>
      </View>
      <TouchableOpacity
        style={[styles.allowButton, unblockingUserId === item.id && styles.buttonDisabled]}
        onPress={() => handleUnblock(item.id, item.username)}
        disabled={unblockingUserId === item.id}
      >
        {unblockingUserId === item.id ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.allowButtonText}>Allow</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Blocked Mentions</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : blockedUsers.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="at-circle-outline" size={64} color="#666" style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No Blocked Mentions</Text>
          <Text style={styles.emptySubtitle}>
            Users you've prevented from mentioning you will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  username: {
    color: '#999',
    fontSize: 14,
    marginTop: 2,
  },
  allowButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  allowButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
