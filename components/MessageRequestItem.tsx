import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getOptimalImageUrl } from '@/utils/imageUtils';

interface MessageRequestItemProps {
  request: {
    id: string;
    fromUsername: string;
    fromProfileImage?: string;
    fromProfileThumbnail?: string;
    text: string;
    createdAt: any;
  };
  onApprove: () => void;
  onIgnore: () => void;
}

export default function MessageRequestItem({ request, onApprove, onIgnore }: MessageRequestItemProps) {
  const profileImage = getOptimalImageUrl(
    request.fromProfileThumbnail,
    request.fromProfileImage
  );

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={
            profileImage 
              ? { uri: profileImage }
              : require('@/assets/images/profile-icon.png')
          }
          style={styles.profileImage}
        />
        <View style={styles.headerText}>
          <Text style={styles.username}>{request.fromUsername}</Text>
          <Text style={styles.timestamp}>{formatTime(request.createdAt)}</Text>
        </View>
        <Ionicons name="mail" size={20} color="#666" />
      </View>
      
      <Text style={styles.messageText} numberOfLines={3}>
        {request.text}
      </Text>
      
      <View style={styles.actions}>
        <TouchableOpacity style={styles.ignoreButton} onPress={onIgnore}>
          <Text style={styles.ignoreButtonText}>Ignore</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.approveButton} onPress={onApprove}>
          <Text style={styles.approveButtonText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  username: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  messageText: {
    color: '#DDD',
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  ignoreButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  approveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#4CD964',
  },
  ignoreButtonText: {
    color: '#CCC',
    fontSize: 14,
    fontWeight: '500',
  },
  approveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});