import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

const ViewPost = ({ route }) => {
  const { post } = route.params;
  const [comments, setComments] = useState([
    { id: 1, author: 'Jane Doe', profileImage: 'https://via.placeholder.com/50', text: 'Great post!' },
    { id: 2, author: 'John Smith', profileImage: 'https://via.placeholder.com/50', text: 'Thanks for sharing!' },
    { id: 3, author: 'Alice Johnson', profileImage: 'https://via.placeholder.com/50', text: 'Very informative!' },
    { id: 4, author: 'Bob Brown', profileImage: 'https://via.placeholder.com/50', text: 'I love this!' },
    { id: 5, author: 'Charlie Davis', profileImage: 'https://via.placeholder.com/50', text: 'Amazing content!' },
    { id: 6, author: 'Jane Doe', profileImage: 'https://via.placeholder.com/50', text: 'Great post!' },
    { id: 7, author: 'John Smith', profileImage: 'https://via.placeholder.com/50', text: 'Thanks for sharing!' },
    { id: 8, author: 'Alice Johnson', profileImage: 'https://via.placeholder.com/50', text: 'Very informative!' },
    { id: 9, author: 'Bob Brown', profileImage: 'https://via.placeholder.com/50', text: 'I love this!' },
    { id: 10, author: 'Charlie Davis', profileImage: 'https://via.placeholder.com/50', text: 'Amazing content!' },
  ]);
  const [newComment, setNewComment] = useState('');
  const [likes, setLikes] = useState(post.likes);
  const [liked, setLiked] = useState(false);

  const handleAddComment = () => {
    if (newComment.trim()) {
      setComments([...comments, { id: comments.length + 1, author: 'Current User', profileImage: 'https://via.placeholder.com/50', text: newComment }]);
      setNewComment('');
    }
  };

  const handleLikePress = () => {
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: post.profileImage }} style={styles.profileImage} />
        <Text style={styles.username}>{post.username}</Text>
      </View>
      <Image source={{ uri: post.image }} style={styles.postImage} />
      <View style={styles.postInfo}>
        <View style={styles.likesComments}>
          <TouchableOpacity onPress={handleLikePress}>
            <FontAwesome name={liked ? "heart" : "heart-o"} size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.postLikes}>{likes}</Text>
          <FontAwesome name="comment-o" size={24} color="white" style={styles.commentIcon} />
          <Text style={styles.postComments}>{comments.length}</Text>
        </View>
        <Text style={styles.postDate}>{post.date.toLocaleString()}</Text>
      </View>
      <FlatList
        data={comments}
        renderItem={({ item }) => (
          <View style={styles.commentContainer}>
            <Image source={{ uri: item.profileImage }} style={styles.commentProfileImage} />
            <View style={styles.commentContent}>
              <Text style={styles.commentAuthor}>{item.author}</Text>
              <Text style={styles.commentText}>{item.text}</Text>
            </View>
          </View>
        )}
        keyExtractor={(item) => item.id.toString()}
      />
      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          placeholderTextColor="grey"
          value={newComment}
          onChangeText={setNewComment}
        />
        <TouchableOpacity style={styles.addCommentButton} onPress={handleAddComment}>
          <Text style={styles.addCommentButtonText}>Post</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  username: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginBottom: 20,
  },
  postInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  likesComments: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postLikes: {
    color: 'white',
    fontSize: 18,
    marginLeft: 5,
    marginRight: 15,
  },
  postComments: {
    color: 'white',
    fontSize: 18,
    marginLeft: 5,
  },
  postDate: {
    color: 'gray',
  },
  commentIcon: {
    marginLeft: 15,
  },
  commentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
  },
  commentProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentAuthor: {
    color: 'white',
    fontWeight: 'bold',
  },
  commentText: {
    color: 'white',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#2e2e2e',
    color: 'white',
    padding: 10,
    borderRadius: 5,
  },
  addCommentButton: {
    marginLeft: 10,
    backgroundColor: '#1c1c1e',
    padding: 10,
    borderRadius: 5,
  },
  addCommentButtonText: {
    color: 'white',
  },
});

export default ViewPost;
