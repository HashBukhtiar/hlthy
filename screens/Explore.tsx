import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, TouchableOpacity, Text, TextInput, StyleSheet, ActivityIndicator, Image, FlatList, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import globalStyles from '@/styles/globalStyles';
import { collection, query, where, getDocs, limit, orderBy, startAfter, QueryDocumentSnapshot, DocumentData, QuerySnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useAuth } from '@/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

interface ExplorePost {
  id: string;
  imageUrl: string;
  authorId?: string;
  authorArchetype?: string;
  isArchetypePost?: boolean;
}

interface UserSearchResult {
  id: string;
  username?: string;
  displayName?: string;
  profilePictureUrl?: string;
}

// Fisher-Yates shuffle algorithm
const shuffleArray = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const ShimmerPlaceholder = () => {
  const animatedValue = new Animated.Value(0);

  useEffect(() => {
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1000, // A slightly faster animation
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200], // Adjust to ensure it crosses the whole element
  });

  return (
    <View style={styles.skeletonItem}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { 
            transform: [{ translateX }],
            backgroundColor: 'transparent', // Ensure background is transparent
          },
        ]}
      >
        <LinearGradient
          colors={['#2e2e2e', '#3a3a3a', '#2e2e2e']}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />
      </Animated.View>
    </View>
  );
};

const PostGridItem = ({ item, onPress }: { item: ExplorePost; onPress: () => void }) => {
  const imageOpacity = useRef(new Animated.Value(0)).current;

  const onImageLoad = () => {
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 300, // Fade in duration
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      style={[
        styles.postPreview,
        // Temporary borders for testing
        item.isArchetypePost 
          ? { borderColor: 'green', borderWidth: 2 } 
          : { borderColor: 'blue', borderWidth: 2 }
      ]}
      onPress={onPress}
    >
      <ShimmerPlaceholder />
      <Animated.Image
        source={{ uri: item.imageUrl }}
        style={[styles.postImage, { position: 'absolute', opacity: imageOpacity }]}
        onLoad={onImageLoad}
      />
    </TouchableOpacity>
  );
};

export default function Explore() {
  const router = useRouter();
  const { userProfile, currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [allPostsLoaded, setAllPostsLoaded] = useState(false);


  const checkArchetypePosts = async () => {
  try {
    console.log("Running diagnostic query for 'bodybuilder' archetype...");
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, where('authorArchetype', '==', 'bodybuilder'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("DIAGNOSTIC: No documents found with authorArchetype: 'bodybuilder'. Check your Firestore data for exact spelling and case.");
    } else {
      console.log(`DIAGNOSTIC: Found ${querySnapshot.size} documents with this archetype.`, 'Now checking other fields:');
      querySnapshot.forEach(doc => {
        const data = doc.data();
        console.log({
          id: doc.id,
          visibility: data.visibility, // Should be 'public'
          imageUrl: data.imageUrl,     // Should not be null
          authorArchetype: data.authorArchetype,
        });
      });
    }
  } catch (error) {
    console.error("DIAGNOSTIC ERROR:", error);
    console.log("If you see a 'FAILED_PRECONDITION' error, Firestore requires a composite index. The error message will contain a link to create it in the Firebase console.");
  }
};

// You can call it from your useEffect like this to test:
useEffect(() => {
  if (!searchQuery) {
    fetchExplorePosts();
    console.log('checking....')
    checkArchetypePosts(); // <-- Add this call for testing
  }
}, [userProfile]);

  const fetchExplorePosts = useCallback(async (loadMore = false) => {
    if (loadingPosts || (loadMore && allPostsLoaded) || !currentUser) return;

    setLoadingPosts(true);
    try {
      const postsRef = collection(db, 'posts');
      let fetchedPosts: ExplorePost[] = [];
      let newLastVisible: QueryDocumentSnapshot<DocumentData> | null = null;

      if (loadMore) {
        // For subsequent loads, fetch general public posts
        const q = query(
          postsRef,
          where('visibility', '==', 'public'),
          where('imageUrl', '!=', null),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(21)
        );
        const querySnapshot = await getDocs(q);
        
        // Exclude own posts and posts that are already loaded
        const existingPostIds = new Set(posts.map(p => p.id));
        fetchedPosts = querySnapshot.docs
          .map(doc => ({ id: doc.id, imageUrl: doc.data().imageUrl, authorId: doc.data().authorId }))
          .filter(p => p.authorId !== currentUser.uid && !existingPostIds.has(p.id));

        newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || lastVisible;
      } else {
        // Initial personalized fetch
        const archetype = userProfile?.archetype;
        console.log("Attempting to fetch posts for archetype:", archetype);

        const postsRef = collection(db, 'posts');
        let archetypePosts: ExplorePost[] = [];
        let otherPosts: ExplorePost[] = [];
        let archetypeSnapshot: QuerySnapshot<DocumentData> | null = null;

        if (archetype) {
          // Fetch archetype posts only if an archetype is defined
          const BATCH_SIZE_ARCHETYPE = 15;
          const archetypeQuery = query(
            postsRef,
            where('visibility', '==', 'public'),
            where('imageUrl', '!=', null),
            where('authorArchetype', '==', archetype),
            orderBy('createdAt', 'desc'),
            limit(BATCH_SIZE_ARCHETYPE)
          );
          archetypeSnapshot = await getDocs(archetypeQuery);
          archetypePosts = archetypeSnapshot.docs
            .map(doc => ({ 
              id: doc.id, 
              imageUrl: doc.data().imageUrl, 
              authorArchetype: doc.data().authorArchetype, 
              authorId: doc.data().authorId,
              isArchetypePost: true
            }))
            .filter(p => p.authorId !== currentUser.uid);
        }

        // Fetch other public posts
        const BATCH_SIZE_OTHER = 15;
        const otherQuery = query(
          postsRef,
          where('visibility', '==', 'public'),
          where('imageUrl', '!=', null),
          orderBy('createdAt', 'desc'),
          limit(BATCH_SIZE_OTHER)
        );
        
        const otherSnapshot = await getDocs(otherQuery);
        const archetypePostIds = new Set(archetypePosts.map(p => p.id));

        otherPosts = otherSnapshot.docs
          .map(doc => ({ 
            id: doc.id, 
            imageUrl: doc.data().imageUrl, 
            authorArchetype: doc.data().authorArchetype, 
            authorId: doc.data().authorId,
            isArchetypePost: false
          }))
          .filter(p => {
            // Exclude own posts
            if (p.authorId === currentUser.uid) return false;
            // Exclude posts already in the archetype list
            if (archetypePostIds.has(p.id)) return false;
            // If an archetype exists, exclude posts of that archetype
            if (archetype && p.authorArchetype === archetype) return false;
            // Keep the post if it passes all checks
            return true;
          })
          .slice(0, 15);

        console.log("Archetype Post IDs:", archetypePosts.map(p => p.id));
        console.log("Other Post IDs:", otherPosts.map(p => p.id));

        fetchedPosts = shuffleArray([...archetypePosts, ...otherPosts]);
        
        // For pagination, determine the last visible document correctly from all fetched docs
        const allFetchedDocs = [...(archetypeSnapshot?.docs || []), ...otherSnapshot.docs]
            .sort((a, b) => b.data().createdAt.toMillis() - a.data().createdAt.toMillis());
        
        newLastVisible = allFetchedDocs.length > 0 ? allFetchedDocs[allFetchedDocs.length - 1] : null;
      }

      if (fetchedPosts.length < 21 && !loadMore) { // Only for initial load, pagination handles its own
        // This logic might need adjustment based on desired behavior
      } else if (loadMore && fetchedPosts.length === 0) {
        setAllPostsLoaded(true);
      }

      setLastVisible(newLastVisible);
      setPosts(prev => loadMore ? [...prev, ...fetchedPosts] : fetchedPosts);

    } catch (error) {
      console.error("Error fetching explore posts:", error);
    } finally {
      setLoadingPosts(false);
    }
  }, [loadingPosts, allPostsLoaded, lastVisible, userProfile, currentUser]);

  useEffect(() => {
    if (!searchQuery) {
      fetchExplorePosts();
    }
  }, [userProfile]); // Refetch if user profile changes

  const handleSearch = useCallback(async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length < 2) {
      setSearchResults([]);
      setSearchPerformed(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setSearchPerformed(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('username', '>=', text.toLowerCase()),
        where('username', '<=', text.toLowerCase() + '\uf8ff'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const users: UserSearchResult[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        username: doc.data().username,
        displayName: doc.data().displayName,
        profilePictureUrl: doc.data().profileImageUrl,
      }));
      setSearchResults(users);
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const renderSearchBar = () => (
    <View style={styles.searchBarView}>
      <TextInput
        placeholder="Search users..."
        style={[styles.searchBar, { color: 'white' }]}
        onChangeText={handleSearch}
        value={searchQuery}
        placeholderTextColor="grey"
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
      />
    </View>
  );

  const renderUserResultItem = (user: UserSearchResult) => (
    <TouchableOpacity
      key={user.id}
      style={styles.userResultItem}
      onPress={() => router.push(`/profile/${user.id}`)}
    >
      <Image
        source={user.profilePictureUrl ? { uri: user.profilePictureUrl } : require('@/assets/images/profile-icon.png')}
        style={styles.profilePic}
      />
      <View>
        <Text style={styles.displayName}>{user.displayName || user.username}</Text>
        {user.displayName && <Text style={styles.username}>@{user.username}</Text>}
      </View>
    </TouchableOpacity>
  );

  const renderSearchResultsView = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />;
    }
    if (!searchPerformed) {
      return null;
    }
    if (searchResults.length === 0 && searchQuery.trim().length >= 2) {
      return <Text style={styles.noResultsText}>No users found for "{searchQuery}"</Text>;
    }
    return (
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderUserResultItem(item)}
      />
    );
  };

  const renderPostsGrid = () => {
    if (loadingPosts && posts.length === 0) {
      return (
        <View style={styles.skeletonContainer}>
          {Array.from({ length: 18 }).map((_, index) => (
            <View key={index} style={styles.skeletonPreview}>
              <ShimmerPlaceholder />
            </View>
          ))}
        </View>
      );
    }
    return (
      <FlatList
        data={posts}
        numColumns={3}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostGridItem item={item} onPress={() => router.push(`/view-post/${item.id}`)} />
        )}
        onEndReached={() => fetchExplorePosts(true)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingPosts && posts.length > 0 ? <ActivityIndicator style={{ margin: 20 }} size="small" color="#FFF" /> : null}
      />
    );
  };

  return (
    <View style={globalStyles.container}>
      <View style={styles.headerContainer}>
        <Text style={globalStyles.title}>Explore</Text>
      </View>
      {renderSearchBar()}
      <View style={{ flex: 1 }}>
        {searchQuery.trim().length > 0 || searchPerformed ? renderSearchResultsView() : renderPostsGrid()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 10,
    paddingHorizontal: 15,
    paddingBottom: 5,
  },
  searchBarView: {
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  searchBar: {
    backgroundColor: '#2e2e2e',
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    color: 'white',
  },
  userResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#555',
  },
  displayName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  username: {
    color: 'grey',
    fontSize: 14,
  },
  noResultsText: {
    color: 'grey',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  postPreview: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 1,
  },
  postImage: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
  },
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skeletonPreview: {
    width: '33.333%',
    aspectRatio: 1,
    padding: 1,
  },
  skeletonItem: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2e2e2e',
    borderRadius: 2,
    overflow: 'hidden',
  },
});