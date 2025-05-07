import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, ScrollView, Text, TextInput, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import globalStyles from '@/styles/globalStyles';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

// Keep PostData if you plan to reintegrate post exploration later
interface PostData {
  id: string;
  label: string;
  image?: string;
}

interface UserSearchResult {
  id: string;
  username?: string;
  displayName?: string;
  profilePictureUrl?: string;
}

export default function Explore() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false); // To know if a search has been attempted

  // Mock posts data (can be removed or replaced with actual post fetching later)
  const buttonsData: PostData[] = [
    { id: '1', label: 'Post 1', image: 'https://via.placeholder.com/150' },
    { id: '2', label: 'Post 2', image: 'https://via.placeholder.com/150' },
    // ... more mock posts
  ];

  const handleSearch = useCallback(async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length < 2) { // Only search if query is at least 2 chars
      setSearchResults([]);
      setSearchPerformed(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setSearchPerformed(true);
    try {
      // Assuming users have a 'username' field that is queryable.
      // For case-insensitive search, you might store a lowercase version of username.
      // This is a simple prefix search.
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('username', '>=', text.toLowerCase()), // Search by lowercase username
        where('username', '<=', text.toLowerCase() + '\uf8ff'),
        limit(10) // Limit the number of results
      );
      const querySnapshot = await getDocs(q);
      const users: UserSearchResult[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        username: doc.data().username,
        displayName: doc.data().displayName,
        profilePictureUrl: doc.data().profilePictureUrl,
      }));
      setSearchResults(users);
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);


  const renderSearchBar = () => {
    return (
      <View style={styles.searchBarView}>
        <TextInput
          placeholder="Search users..."
          style={[styles.searchBar, { color: 'white' }]}
          onChangeText={handleSearch} // Use the debounced handler
          value={searchQuery}
          placeholderTextColor="grey"
          autoCapitalize="none"
        />
      </View>
    );
  };

  const renderUserResultItem = (user: UserSearchResult) => (
    <TouchableOpacity
      key={user.id}
      style={styles.userResultItem}
      onPress={() => router.push({
        pathname: `/profile/${user.id}`, // Navigate to the dynamic profile route
      })}
    >
      <Image
        source={user.profilePictureUrl ? { uri: user.profilePictureUrl } : require('@/assets/images/profile-icon.png')} // Fallback image
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
    if (!searchPerformed) { // Don't show "no results" before a search is done
        return null;
    }
    if (searchResults.length === 0 && searchQuery.trim().length >=2) {
      return <Text style={styles.noResultsText}>No users found for "{searchQuery}"</Text>;
    }
    return (
      <ScrollView>
        {searchResults.map(user => renderUserResultItem(user))}
      </ScrollView>
    );
  };

  // Original posts grid (can be conditionally rendered or removed)
  const renderPostsGrid = (buttons: PostData[]) => {
    // ... (your existing posts grid logic - keep if needed for default view)
    // For now, we'll hide it if a search is active
    if (searchQuery.trim().length > 0 || searchPerformed) {
        return null;
    }

    const rows = [];
    for (let i = 0; i < buttons.length; i += 3) {
      const chunk = buttons.slice(i, i + 3);
      rows.push(
        <View key={`row-${i}`} style={styles.row}>
          {chunk.map((button) => (
            <TouchableOpacity
              key={button.id}
              style={styles.postPreview}
              onPress={() => router.push({
                pathname: '/view-post/[id]', // Ensure this route exists
                params: {
                  id: button.id.toString(),
                  // Pass necessary post data if view-post expects it
                }
              })}
            >
              <Text style={styles.postPreviewText}>{button.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }
    return rows;
  };


  return (
    <View style={globalStyles.container}>
      <View style={styles.headerContainer}>
        <Text style={globalStyles.title}>Explore</Text>
      </View>
      {renderSearchBar()}
      <ScrollView contentContainerStyle={globalStyles.contentContainer}>
        { (searchQuery.trim().length > 0 || searchPerformed) ? renderSearchResultsView() : renderPostsGrid(buttonsData)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // ... (globalStyles.container and globalStyles.title are from globalStyles)
  headerContainer: {
    paddingTop: 10, // Adjust as needed, especially if not using a SafeAreaView here
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
    color: 'white', // Ensure text input color is white
  },
  userResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333', // Darker separator
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#555', // Placeholder background
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
  // Styles for the posts grid (can be adjusted or removed if not used)
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Or 'space-around'
    marginBottom: 5, // Adjust spacing between rows
    paddingHorizontal: 5, // Add some horizontal padding to the row container
  },
  postPreview: {
    // Calculate width based on screen width and desired spacing
    // For 3 items per row with some spacing: (screenWidth - (spacing * (itemsPerRow + 1))) / itemsPerRow
    // This is a simplified approach, consider using Dimensions API for more accuracy
    width: '32%', // Adjust for desired spacing
    aspectRatio: 1, // Make it square
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'grey', // Placeholder
    borderRadius: 10,
    marginBottom: 5, // Spacing below each post item
  },
  postPreviewText: {
    color: 'white',
  },
});