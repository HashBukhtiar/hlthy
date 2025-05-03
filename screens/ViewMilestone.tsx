import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ViewMilestone() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  // Mock milestone data (would be fetched from API/database in a real app)
  const milestone = {
    id,
    title: '10k Run Personal Best',
    achievement: 'Ran 10K in under 45 minutes',
    date: 'May 1, 2025',
    description: 'After months of training, I finally broke the 45-minute barrier for my 10K run. Feeling accomplished!\n\nThis page is a template for now. To be fleshed out.',
    category: 'Running'
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="trophy" size={32} color="#FFD700" style={styles.trophyIcon} />
          </View>
          <Text style={styles.title}>{milestone.title}</Text>
          <Text style={styles.category}>{milestone.category}</Text>
          <Text style={styles.achievement}>{milestone.achievement}</Text>
          <Text style={styles.date}>{milestone.date}</Text>
        </View>

        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{milestone.description}</Text>
        </View>

        {/* More sections can be added here as needed */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    backgroundColor: '#000',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  trophyIcon: {
    padding: 10,
  },
  title: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 8,
  },
  category: {
    color: '#999',
    fontSize: 16,
    marginBottom: 12,
  },
  achievement: {
    color: '#FFF',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  date: {
    color: '#999',
    fontSize: 14,
  },
  detailsSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  sectionTitle: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 18,
    marginBottom: 10,
  },
  description: {
    color: '#CCC',
    fontSize: 16,
    lineHeight: 24,
  },
});