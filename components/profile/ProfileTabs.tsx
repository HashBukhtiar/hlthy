import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { OptimizedImageLight } from '@/components/OptimizedImage';
import { MilestoneCard } from './MilestoneCard';
import { WorkoutListItem } from './WorkoutListItem';

interface PostsTabProps {
  displayablePosts: any[];
  refreshing: boolean;
  onRefresh: () => void;
  onImagePress: (post: any) => void;
}

export const PostsTab: React.FC<PostsTabProps> = ({ 
  displayablePosts, 
  refreshing, 
  onRefresh, 
  onImagePress 
}) => {
  return (
    <FlatList
      key="posts-grid"
      data={displayablePosts}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => onImagePress(item)} activeOpacity={0.85}>
          <OptimizedImageLight 
            thumbnailUrl={item.thumbnailUrl} 
            originalUrl={item.imageUrl} 
            style={styles.postImage} 
          />
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.id}
      numColumns={3}
      contentContainerStyle={styles.postsContainer}
      ListEmptyComponent={
        <Text style={{ color: 'gray', textAlign: 'center', padding: 30 }}>No posts yet</Text>
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FFFFFF"
          colors={["#FFFFFF"]}
          progressBackgroundColor="#212121"
        />
      }
    />
  );
};

interface MilestonesTabProps {
  groupedMilestones: Record<string, any[]>;
  onMilestonePress: (postId: string) => void;
  formatTimeAgo: (date: any) => string;
}

export const MilestonesTab: React.FC<MilestonesTabProps> = ({ 
  groupedMilestones, 
  onMilestonePress,
  formatTimeAgo
}) => {
  const monthKeys = Object.keys(groupedMilestones).sort((a, b) => {
    try {
      const dateA = new Date(`01 ${a}`);
      const dateB = new Date(`01 ${b}`);
      return dateB.getTime() - dateA.getTime();
    } catch (e) { return 0; }
  });

  if (monthKeys.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="trophy-outline" size={36} color="#666" style={{ marginBottom: 12 }} />
        <Text style={styles.emptyTitle}>No Milestones Yet</Text>
        <Text style={styles.emptySubtitle}>
          Track your fitness journey by adding milestones.
        </Text>
      </View>
    );
  }
  
  return (
    <FlatList
      key="milestones-list"
      data={monthKeys}
      renderItem={({ item: month }) => (
        <View>
          <Text style={styles.monthHeader}>{month}</Text>
          {groupedMilestones[month].map((milestoneItem: any) => {
            // Infer type
            let milestoneType = "PR";
            if (
              milestoneItem.exerciseName &&
              typeof milestoneItem.exerciseName === "string" &&
              milestoneItem.exerciseName.toLowerCase().includes("weight loss")
            ) {
              milestoneType = "weightLoss";
            } else if (
              milestoneItem.exerciseName &&
              typeof milestoneItem.exerciseName === "string" &&
              milestoneItem.exerciseName.toLowerCase().includes("weight gain")
            ) {
              milestoneType = "weightGain";
            }

            return (
              <TouchableOpacity
                key={milestoneItem.id}
                onPress={() => onMilestonePress(milestoneItem.id)}
                style={styles.milestoneItemCard}
                activeOpacity={0.85}
              >
                <MilestoneCard 
                  milestoneType={milestoneType}
                  details={milestoneItem}
                  formatTimeAgo={formatTimeAgo}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      keyExtractor={(item) => item}
    />
  );
};

interface WorkoutsTabProps {
  workouts: any[];
  loadingWorkouts: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onWorkoutPress: (workoutId: number) => void;
  isOwnProfile: boolean;
}

export const WorkoutsTab: React.FC<WorkoutsTabProps> = ({ 
  workouts, 
  loadingWorkouts, 
  refreshing, 
  onRefresh, 
  onWorkoutPress,
  isOwnProfile
}) => {
  if (loadingWorkouts && (!workouts || workouts.length === 0)) { 
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  if (!workouts || workouts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={{ color: 'gray', textAlign: 'center' }}>
          No workouts yet. Create or save a workout to see it here.
        </Text>
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FFFFFF"
          colors={["#FFFFFF"]}
          progressBackgroundColor="#212121"
        />
      </View>
    );
  }

  // Sort workouts by creation date, newest first
  const sortedWorkoutsData = [...workouts].sort((a, b) => {
    try {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    } catch (error) { return 0; }
  });

  return (
    <FlatList
      key="workouts-list-single-column"
      data={sortedWorkoutsData}
      renderItem={({ item }) => {
        if (!item.isPublic && !isOwnProfile) {
          return null;
        }

        return (
          <WorkoutListItem 
            workout={item}
            onPress={onWorkoutPress}
            isOwnProfile={isOwnProfile}
          />
        );
      }}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.workoutsListSingleColumn} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FFFFFF"
          colors={["#FFFFFF"]}
          progressBackgroundColor="#212121"
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  postsContainer: {
    padding: 0,
  },
  postImage: {
    width: Dimensions.get('window').width / 3,
    height: Dimensions.get('window').width / 3,
    margin: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 200,
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  monthHeader: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#000',
    marginTop: 8,
  },
  milestoneItemCard: {
    backgroundColor: '#1C1C1E',
    marginVertical: 6,
    borderRadius: 16,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  workoutsListSingleColumn: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
});
