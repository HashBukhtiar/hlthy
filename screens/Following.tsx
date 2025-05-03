import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from '@/firebaseConfig';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function Following() {
  const { userId } = useLocalSearchParams();
  const router = useRouter();
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    async function fetchFollowing() {
      if (!userId) return;
      
      try {
        setLoading(true);
        
        // Get username of the profile being viewed
        const userDoc = await getDoc(doc(db, "users", userId.toString()));
        if (userDoc.exists()) {
          setUsername(userDoc.data().username || 'User');
        }
        
        // Get all following
        const followingSnapshot = await getDocs(collection(db, "users", userId.toString(), "following"));
        
        const followingPromises = followingSnapshot.docs.map(async (followingDoc) => {
          // Get the full user data for each followed user
          const userSnapshot = await getDoc(doc(db, "users", followingDoc.id));
          if (userSnapshot.exists()) {
            return {
              id: followingDoc.id,
              ...userSnapshot.data()
            };
          }
          return null;
        });
        
        const followingData = (await Promise.all(followingPromises)).filter(Boolean);
        setFollowing(followingData);
      } catch (err) {
        console.error("Error fetching following:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchFollowing();
  }, [userId]);

  const handleGoBack = () => {
    router.back();
  };
  
  const handleUserPress = (userId) => {
    router.push(`/profile/${userId}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Following</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="white" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Following</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading following: {error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Following</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <Text style={styles.subTitle}>Users {username} follows ({following.length})</Text>
      
      <FlatList
        data={following}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.userItem}
            onPress={() => handleUserPress(item.id)}
          >
            <Image 
              source={{ 
                uri: item.profileImageUrl || 'https://thumbs.dreamstime.com/b/creative-illustration-default-avatar-profile-placeholder-isolated-background-art-design-grey-photo-blank-template-mockup-144855718.jpg'
              }} 
              style={styles.avatar} 
            />
            <View style={styles.userInfo}>
              <Text style={styles.username}>{item.username}</Text>
              <Text style={styles.name}>{item.displayName}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Not following anyone yet</Text>
          </View>
        }
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 5,
  },
  subTitle: {
    color: '#AAA',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    color: 'white',
    fontSize: 16,
    marginBottom: 3,
  },
  name: {
    color: '#999',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF5555',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
});