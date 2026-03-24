import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { ACCENT_COLOR } from '@/constants/Colors';

interface TagChipProps {
  tag: string;           // normalized name without #
  onPress?: () => void;  // navigates to tag feed
}

export const TagChip: React.FC<TagChipProps> = ({ tag, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={styles.text}>#{tag}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: ACCENT_COLOR,
    marginRight: 8,
    marginBottom: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});
