import React, { useState, useEffect, useRef } from 'react';
import { 
  Modal, 
  KeyboardAvoidingView, 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput,
  FlatList,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shareModalStyles } from '@/styles/shareModalStyles';
import { OptimizedImageLight } from '@/components/OptimizedImage';
import { collection, query, where, getDocs, limit, orderBy } from '@/features/infra/firestore';
import { db } from '@/firebaseConfig';
import { debounce } from 'lodash';
import { useBlockEnforcement } from '@/utils/blockUtils';
import { useAuth } from '@/context/AuthContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  onShareWith: (userId: string, username: string, profileImageUrl?: string, profileThumbnailUrl?: string) => Promise<void>;
}

export default function ShareModal({ visible, onClose, onShareWith }: ShareModalProps) {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<{id: string, username: string, profileImageUrl?: string, profileThumbnailUrl?: string}[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const { canInteractWithUser } = useBlockEnforcement();
  const { currentUser } = useAuth();

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const handleSearchUsers = debounce(async (text: string) => {
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const lowerText = text.toLowerCase();
      const q = query(
        collection(db, 'users'),
        where('username', '>=', lowerText),
        where('username', '<=', lowerText + '\uf8ff'),
        orderBy('username'),
        limit(20) // Fetch more to account for filtering
      );
      
      const querySnapshot = await getDocs(q);
      const results: {id: string, username: string, profileImageUrl?: string, profileThumbnailUrl?: string}[] = [];
      
      querySnapshot.forEach(doc => {
        const userData = doc.data();
        const userId = doc.id;
        
        // Skip current user and blocked users
        if (userId === currentUser?.uid) return;
        
        // Check if we can interact with this user (not blocked)
        if (canInteractWithUser(userId, userData.blockedUsers)) {
          results.push({
            id: userId,
            username: userData.username,
            profileImageUrl: userData.profileImageUrl,
            profileThumbnailUrl: userData.profileThumbnailUrl,
          });
        }
      });
      
      // Limit final results
      setSearchResults(results.slice(0, 10));
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearchLoading(false);
    }
  }, 500);

  useEffect(() => {
    if (visible) {
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
      translateY.setValue(SCREEN_HEIGHT);
      opacity.setValue(0);
      setSearchText('');
      setSearchResults([]);
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
    ]).start(() => onClose());
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View style={[shareModalStyles.shareModalContainer, { opacity }]}>
        <Pressable style={{ flex: 1 }} onPress={handleClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 100}
        >
          <Animated.View style={[shareModalStyles.shareModalContent, { transform: [{ translateY }] }]}>
            <View style={shareModalStyles.shareModalHeader}>
            <Text style={shareModalStyles.shareModalTitle}>Share to</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={shareModalStyles.searchContainer}>
            <TextInput
              style={shareModalStyles.searchInput}
              placeholder="Search users..."
              placeholderTextColor="#888"
              value={searchText}
              onChangeText={(text) => {
                setSearchText(text);
                handleSearchUsers(text);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
            />
          </View>

          {searchLoading ? (
            <ActivityIndicator size="large" color="#0A84FF" style={{ marginTop: 20 }} />
          ) : (
              <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={shareModalStyles.userItem}
                  onPress={() => onShareWith(item.id, item.username, item.profileImageUrl, item.profileThumbnailUrl)}
                >
                  <OptimizedImageLight
                    thumbnailUrl={item.profileThumbnailUrl}
                    originalUrl={item.profileImageUrl}
                    style={shareModalStyles.userItemImage}
                  />
                  <Text style={shareModalStyles.userItemText}>{item.username}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={shareModalStyles.emptyResultsText}>
                  {searchText ? "No users found" : "Search for users to share with"}
                </Text>
              }
            />
          )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}