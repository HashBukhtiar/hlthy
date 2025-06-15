import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  TextInput
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { exercises, categories, Exercise } from '../data/exercises';
import { SECONDARY_COLOR } from './PostComponents';

interface SelectExerciseProps {
  onSelectExercise: (exercise: Exercise) => void;
  onBack: () => void;
}

export default function SelectExercise({ onSelectExercise, onBack }: SelectExerciseProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  
  // Filter exercises based on search query and filters
  const filteredExercises = useMemo(() => {
    return exercises.filter(exercise => {
      // Filter by search query
      if (searchQuery && !exercise.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Filter by category
      if (selectedCategory && exercise.category !== selectedCategory) {
        return false;
      }
      
      // Filter by muscle group
      if (selectedMuscleGroup) {
        const hasMuscle = exercise.primaryMuscles.includes(selectedMuscleGroup) || 
                         exercise.secondaryMuscles.includes(selectedMuscleGroup);
        if (!hasMuscle) return false;
      }
      
      return true;
    });
  }, [searchQuery, selectedCategory, selectedMuscleGroup]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSelectedMuscleGroup(null);
  };

  // Render each exercise item
  const renderExerciseItem = ({ item }: { item: Exercise }) => (
    <TouchableOpacity 
      style={styles.exerciseItem}
      onPress={() => onSelectExercise(item)}
    >
      <View style={styles.exerciseContent}>
        <Text style={styles.exerciseName}>{item.name}</Text>
        <Text style={styles.exerciseCategory}>{item.category.charAt(0).toUpperCase() + item.category.slice(1)}</Text>
        
        <View style={styles.muscleTagsContainer}>
          {item.primaryMuscles.map((muscle, index) => (
            <View key={`${item.id}-${muscle}`} style={styles.muscleTag}>
              <Text style={styles.muscleTagText}>{muscle}</Text>
            </View>
          ))}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#888" />
    </TouchableOpacity>
  );


  // Main render
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Exercise</Text>
      </View>

      {/* Search input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#777" style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor="#777"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery || selectedCategory || selectedMuscleGroup ? (
          <TouchableOpacity onPress={clearFilters}>
            <Ionicons name="close-circle" size={20} color="#777" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedCategory === item && styles.filterChipSelected
              ]}
              onPress={() => {
                if (selectedCategory === item) {
                  setSelectedCategory(null);
                } else {
                  setSelectedCategory(item);
                }
              }}
            >
              <Text 
                style={[
                  styles.filterChipText,
                  selectedCategory === item && styles.filterChipTextSelected
                ]}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filtersRow}
        />
      </View>

      {/* Results count */}
      <View style={styles.resultsCountContainer}>
        <Text style={styles.resultsCount}>
          {filteredExercises.length} {filteredExercises.length === 1 ? 'exercise' : 'exercises'} found
        </Text>
      </View>

      {/* Exercise list */}
      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item.id}
        renderItem={renderExerciseItem}
        contentContainerStyle={styles.exerciseList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="dumbbell" size={48} color="#333" />
            <Text style={styles.emptyText}>No exercises found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    padding: 8,
  },
  filtersContainer: {
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  filtersRow: {
    paddingHorizontal: 8,
  },
  filterChip: {
    backgroundColor: '#222',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  filterChipSelected: {
    backgroundColor: SECONDARY_COLOR,
  },
  filterChipText: {
    color: '#CCC',
    fontSize: 14,
  },
  filterChipTextSelected: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  resultsCountContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  resultsCount: {
    color: '#999',
    fontSize: 14,
  },
  exerciseList: {
    paddingBottom: 20,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  exerciseContent: {
    flex: 1,
  },
  exerciseName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  exerciseCategory: {
    color: '#AAA',
    fontSize: 14,
    marginBottom: 8,
  },
  muscleTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  muscleTag: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 6,
  },
  muscleTagText: {
    color: '#CCC',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#777',
    fontSize: 14,
    marginTop: 8,
  },
});