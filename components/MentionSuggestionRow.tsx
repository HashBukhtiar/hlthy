import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MentionSuggestion } from '@/features/mentions/domain/Mention';

interface MentionSuggestionRowProps {
  suggestion: MentionSuggestion;
  onPress: (suggestion: MentionSuggestion) => void;
}

export default function MentionSuggestionRow({ suggestion, onPress }: MentionSuggestionRowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(suggestion)} activeOpacity={0.7}>
      <Image
        source={
          suggestion.profileThumbnailUrl
            ? { uri: suggestion.profileThumbnailUrl }
            : require('@/assets/images/profile-icon.png')
        }
        style={styles.avatar}
      />
      <View style={styles.textContainer}>
        <Text style={styles.username} numberOfLines={1}>@{suggestion.username}</Text>
        {suggestion.displayName ? (
          <Text style={styles.displayName} numberOfLines={1}>{suggestion.displayName}</Text>
        ) : null}
      </View>
      {suggestion.bucket !== 'other' && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {suggestion.bucket === 'follower' ? 'Follows you' : 'Following'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
  },
  textContainer: {
    flex: 1,
    marginLeft: 10,
  },
  username: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  displayName: {
    color: '#999',
    fontSize: 12,
    marginTop: 1,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  badgeText: {
    color: '#999',
    fontSize: 11,
  },
});
