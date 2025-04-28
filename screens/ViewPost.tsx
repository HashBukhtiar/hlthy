import React from 'react';
import { StyleSheet, Text, View, Image, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import globalStyles from '@/styles/globalStyles';

interface PostDataParams {
  image?: string; 
  date: string;
  likes: number;
  username: string;
  profileImage: string;
}

export default function ViewPost() {
  const { id, postData } = useLocalSearchParams<{ id: string, postData: string }>();
  
  let parsedPostData: PostDataParams | null = null;
  try {
    if (postData) {
      parsedPostData = JSON.parse(postData) as PostDataParams;
    }
  } catch (e) {
    console.error("Failed to parse post data:", e);
  }
  
  return (
    <View style={[globalStyles.container, styles.container]}>
      <ScrollView>
        <Text style={styles.title}>Post #{id}</Text>
        
        {parsedPostData && (
          <View style={styles.postContainer}>
            <View style={styles.userInfoContainer}>
              <Image 
                source={{ uri: parsedPostData.profileImage }} 
                style={styles.profileImage} 
              />
              <Text style={styles.username}>{parsedPostData.username}</Text>
            </View>
            
            {parsedPostData.image && (
              <Image 
                source={{ uri: parsedPostData.image }} 
                style={styles.postImage} 
                resizeMode="cover"
              />
            )}
            
            <View style={styles.postDetails}>
              <Text style={styles.dateText}>
                {new Date(parsedPostData.date).toLocaleDateString()}
              </Text>
              <Text style={styles.likesText}>
                {parsedPostData.likes} likes
              </Text>
            </View>
          </View>
        )}
        
        {!parsedPostData && (
          <Text style={styles.errorText}>Failed to load post data</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  postContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 12,
  },
  postDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateText: {
    color: '#aaa',
    fontSize: 14,
  },
  likesText: {
    color: 'white',
    fontSize: 14,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
});