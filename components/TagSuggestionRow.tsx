import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { ACCENT_COLOR } from '@/constants/Colors';
import type { TagSearchResult } from '@/features/tags/domain/Tag';

interface TagSuggestionRowProps {
  result: TagSearchResult | { name: string; isNew: true };
  onPress: () => void;
}

export const TagSuggestionRow: React.FC<TagSuggestionRowProps> = ({
  result,
  onPress,
}) => {
  const isNew = 'isNew' in result && result.isNew;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Text style={styles.tagName}>#{result.name}</Text>
      {!isNew && (
        <Text style={styles.postCount}>
          {(result as TagSearchResult).postCount}{' '}
          {(result as TagSearchResult).postCount === 1 ? 'post' : 'posts'}
        </Text>
      )}
      {isNew && <Text style={styles.createLabel}>Create tag</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  tagName: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT_COLOR,
    flex: 1,
  },
  postCount: {
    fontSize: 12,
    color: '#888888',
  },
  createLabel: {
    fontSize: 12,
    color: '#888888',
    fontStyle: 'italic',
  },
});
