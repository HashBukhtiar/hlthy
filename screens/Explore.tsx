import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView, Text, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import globalStyles from '@/styles/globalStyles';

interface PostData {
  id: number;
  label: string;
  image?: string;
}

export default function Explore() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const buttonsData: PostData[] = [
    { id: 1, label: 'Post 1', image: 'https://via.placeholder.com/150' },
    { id: 2, label: 'Post 2', image: 'https://via.placeholder.com/150' },
    { id: 3, label: 'Post 3', image: 'https://via.placeholder.com/150' },
    { id: 4, label: 'Post 4' },
    { id: 5, label: 'Post 5' },
    { id: 6, label: 'Post 6' },
    { id: 7, label: 'Post 7' },
    { id: 8, label: 'Post 8' },
    { id: 9, label: 'Post 9' },
    { id: 10, label: 'Post 10' },
    { id: 11, label: 'Post 11' },
    { id: 12, label: 'Post 12' },
    { id: 13, label: 'Post 13' },
    { id: 14, label: 'Post 14' },
    { id: 15, label: 'Post 15' },
    { id: 16, label: 'Post 16' },
    { id: 17, label: 'Post 17' },
    { id: 18, label: 'Post 18' },
    { id: 19, label: 'Post 19' },
    { id: 20, label: 'Post 20' },
    { id: 21, label: 'Post 21' },
    { id: 22, label: 'Post 22' },
    { id: 23, label: 'Post 23' },
    { id: 24, label: 'Post 24' },
    { id: 25, label: 'Post 25' },
    { id: 26, label: 'Post 26' },
    { id: 27, label: 'Post 27' },
    { id: 28, label: 'Post 28' },
    { id: 29, label: 'Post 29' },
    { id: 30, label: 'Post 30' },
    { id: 31, label: 'Post 31' },
    { id: 32, label: 'Post 32' },
    { id: 33, label: 'Post 33' },
    { id: 34, label: 'Post 34' },
    { id: 35, label: 'Post 35' },
    { id: 36, label: 'Post 36' },
  ];

  const renderSearchBar = () => {
    return (
      <View style={styles.searchBarView}>
        <TextInput 
          placeholder="Search hlthy..." 
          style={[styles.searchBar, { color: 'white' }]}
          onChangeText={(text) => {setSearchQuery(text)}}
          value={searchQuery}
          placeholderTextColor="grey"
        />
      </View>
    );
  }

  const renderPostsGrid = (buttons: PostData[]) => {
    const rows = [];
    for (let i = 0; i < buttons.length; i += 3) {
      const chunk = buttons.slice(i, i + 3);
      rows.push(
        <View key={i} style={styles.row}>
          {chunk.map((button) => (
            <TouchableOpacity 
              key={button.id} 
              style={styles.postPreview}
              onPress={() => router.push({
                pathname: '/view-post/[id]',
                params: { 
                  id: button.id.toString(),
                  postData: JSON.stringify({
                    image: button.image, 
                    date: new Date().toISOString(), 
                    likes: 0, 
                    username: 'John Doe', 
                    profileImage: 'https://thumbs.dreamstime.com/b/creative-illustration-default-avatar-profile-placeholder-isolated-background-art-design-grey-photo-blank-template-mockup-144855718.jpg'
                  })
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

  return(
    <View style={[globalStyles.container, styles.explorePage]}>
      {renderSearchBar()}
      <ScrollView contentContainerStyle={styles.pageContent}>
        {renderPostsGrid(buttonsData)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  explorePage: {
    flex: 1,
    backgroundColor: 'black',
  },
  searchBarView: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row' as 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2e2e2e',
    width: '95%',
    height: 40,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  pageContent: {
    width: '100%',
    backgroundColor: 'black',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    marginBottom: 10,
    width: '100%',
    justifyContent: 'space-around',
  },
  postPreview: {
    width: 125,
    height: 125,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'grey',
    borderRadius: 10
  },
  postPreviewText: {
    color: 'white',
  },
});