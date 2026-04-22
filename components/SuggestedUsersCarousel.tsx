import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SuggestedUser } from '@/features/social/domain/SuggestedUser';
import SuggestedUserCard from '@/components/SuggestedUserCard';

interface Props {
  suggestions: SuggestedUser[];
}

const CARDS_VISIBLE = 5;

export default function SuggestedUsersCarousel({ suggestions }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const handleDismiss = (userId: string) => {
    setDismissed(prev => new Set(prev).add(userId));
  };

  const visible = suggestions.filter(s => !dismissed.has(s.userId)).slice(0, CARDS_VISIBLE);

  if (visible.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Header row */}
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(e => !e)} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <Ionicons name="person-add-outline" size={14} color="#FFF" />
          </View>
          <Text style={styles.headerTitle}>Suggested for you</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#8E8E93"
        />
      </TouchableOpacity>

      {/* Cards */}
      {expanded && (
        <FlatList
          data={visible}
          keyExtractor={item => item.userId}
          renderItem={({ item }) => (
            <SuggestedUserCard user={item} onDismiss={handleDismiss} />
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    marginHorizontal: 12,
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1C1C1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
});
