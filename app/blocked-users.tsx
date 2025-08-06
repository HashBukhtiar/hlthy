import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc, arrayRemove, collection, query, where, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, app } from '@/firebaseConfig';
import { getOptimalImageUrl } from '@/utils/imageUtils';

interface BlockedUser {
  id: string;
  username: string;
  displayName: string;
  profileImageUrl?: string;
  profileThumbnailUrl?: string;
}

export default function BlockedUsers() {
  const router = useRouter();
  const { currentUser, userProfile } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    if (!currentUser || !userProfile?.blockedUsers) {
      setLoading(false);
      return;
    }

    try {
      const blockedUserIds = userProfile.blockedUsers;
      if (blockedUserIds.length === 0) {
        setBlockedUsers([]);
        setLoading(false);
        return;
      }

      // Handle Firestore 'in' query limit (max 10 items)
      const chunks = [];
      for (let i = 0; i < blockedUserIds.length; i += 10) {
        chunks.push(blockedUserIds.slice(i, i + 10));
      }

      const users: BlockedUser[] = [];
      const usersRef = collection(db, 'users');

      for (const chunk of chunks) {
        const q = query(usersRef, where('__name__', 'in', chunk));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          users.push({
            id: doc.id,
            username: userData.username || 'Unknown',
            displayName: userData.displayName || 'Unknown User',
            profileImageUrl: userData.profileImageUrl,
            profileThumbnailUrl: userData.profileThumbnailUrl,
          });
        });
      }

      setBlockedUsers(users);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      Alert.alert('Error', 'Failed to load blocked users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockUser = async (userId: string, username: string) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock @${username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'default',
          onPress: async () => {
            setUnblockingUserId(userId);
            try {
              const functions = getFunctions(app, 'northamerica-northeast2');
              const unblockUserFn = httpsCallable(functions, 'unblockUser');
              await unblockUserFn({ targetUserId: userId });

              setBlockedUsers(prev => prev.filter(user => user.id !== userId));
              Alert.alert('Success', `@${username} has been unblocked`);
            } catch (error) {
              console.error('Error unblocking user:', error);
              Alert.alert('Error', 'Failed to unblock user');
            } finally {
              setUnblockingUserId(null);
            }
          }
        }
      ]
    );
  };

  const renderBlockedUser = ({ item }: { item: BlockedUser }) => (
    <View style={styles.userCard}>
      <Image
        source={{
          uri: getOptimalImageUrl(item.profileThumbnailUrl, item.profileImageUrl) ||
            'https://thumbs.dreamstime.com/b/creative-illustration-default-avatar-profile-placeholder-isolated-background-art-design-grey-photo-blank-template-mockup-144855718.jpg'
        }}
        style={styles.profileImage}
      />
      <View style={styles.userInfo}>
        <Text style={styles.displayName}>{item.displayName}</Text>
        <Text style={styles.username}>@{item.username}</Text>
      </View>
      <TouchableOpacity
        style={[
          styles.unblockButton, 
          unblockingUserId === item.id && styles.unblockButtonDisabled
        ]}
        onPress={() => handleUnblockUser(item.id, item.username)}
        disabled={unblockingUserId === item.id}
      >
        {unblockingUserId === item.id ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.unblockButtonText}>Unblock</Text>
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
        <Text style={styles.title}>Blocked Users</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading blocked users...</Text>
        </View>
      ) : blockedUsers.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="ban" size={64} color="#666" style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No Blocked Users</Text>
          <Text style={styles.emptySubtitle}>
            Users you block will appear here. You can unblock them at any time.
          </Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderBlockedUser}
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
  unblockButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  unblockButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: '#999',
    fontSize: 16,
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
  unblockButtonDisabled: {
    opacity: 0.6,
  },
});