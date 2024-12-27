import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, FlatList, TextInput } from 'react-native';

const ViewPost = ({ route }) => {
  const { post } = route.params;
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  const handleAddComment = () => {
    if (newComment.trim()) {
      setComments([...comments, { id: comments.length + 1, text: newComment }]);
      setNewComment('');
    }
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
          <Text style={styles.postLikes}>❤️ {post.likes}</Text>
          <Text style={styles.postComments}>💬 {comments.length}</Text>
        </View>
        <Text style={styles.postDate}>{post.date.toLocaleString()}</Text>
      </View>
      <TouchableOpacity style={styles.commentButton} onPress={() => setCommentsVisible(!commentsVisible)}>
        <Text style={styles.commentButtonText}>Show Comments</Text>
      </TouchableOpacity>
      <FlatList
        data={comments}
        renderItem={({ item }) => <Text style={styles.comment}>{item.text}</Text>}
        keyExtractor={(item) => item.id.toString()}
      />
      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
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
  },
  postInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  likesComments: {
    flexDirection: 'row',
  },
  postLikes: {
    color: 'white',
    fontSize: 18,
    marginRight: 15,
  },
  postComments: {
    color: 'white',
    fontSize: 18,
  },
  postDate: {
    color: 'gray',
  },
  commentButton: {
    backgroundColor: '#1c1c1e',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  commentButtonText: {
    color: 'white',
  },
  comment: {
    color: 'white',
    marginBottom: 5,
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
