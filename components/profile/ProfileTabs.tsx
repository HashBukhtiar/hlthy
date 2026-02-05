import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { OptimizedImageLight } from '@/components/OptimizedImage';
import { MilestoneCard } from './MilestoneCard';
import { WorkoutListItem } from './WorkoutListItem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

  // Calculate total milestones count
  const totalMilestones = Object.values(groupedMilestones).reduce(
    (acc, milestones) => acc + milestones.length, 
    0
  );

  if (monthKeys.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <LinearGradient
            colors={['rgba(255,94,105,0.2)', 'rgba(255,94,105,0.05)']}
            style={styles.emptyIconGradient}
          >
            <MaterialCommunityIcons name="trophy-outline" size={40} color="#FF5E69" />
          </LinearGradient>
        </View>
        <Text style={styles.emptyTitle}>No Milestones Yet</Text>
        <Text style={styles.emptySubtitle}>
          Your personal records and achievements{'\n'}will appear here
        </Text>
      </View>
    );
  }
  
  // Render month section header
  const renderMonthHeader = (month: string, count: number, isFirst: boolean) => (
    <View style={[styles.monthHeaderContainer, isFirst && styles.monthHeaderFirst]}>
      <View style={styles.monthHeaderContent}>
        <View style={styles.monthTextContainer}>
          <Text style={styles.monthText}>{month}</Text>
          <View style={styles.monthCountBadge}>
            <Text style={styles.monthCountText}>{count}</Text>
          </View>
        </View>
        <View style={styles.monthDivider} />
      </View>
    </View>
  );

  // Flatten the data for FlatList
  const flattenedData: { type: 'header' | 'milestone'; data: any; month?: string; isFirst?: boolean; count?: number }[] = [];
  
  monthKeys.forEach((month, monthIndex) => {
    flattenedData.push({ 
      type: 'header', 
      data: month, 
      month, 
      isFirst: monthIndex === 0,
      count: groupedMilestones[month].length 
    });
    
    groupedMilestones[month].forEach((milestone) => {
      flattenedData.push({ type: 'milestone', data: milestone, month });
    });
  });

  return (
    <View style={styles.milestonesContainer}>
      {/* Stats header */}
      <View style={styles.milestonesHeader}>
        <LinearGradient
          colors={['rgba(255,94,105,0.12)', 'rgba(255,94,105,0.03)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        />
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <MaterialCommunityIcons name="trophy" size={24} color="#FF5E69" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Personal Records</Text>
            <Text style={styles.headerSubtitle}>
              {totalMilestones} milestone{totalMilestones !== 1 ? 's' : ''} achieved
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        key="milestones-list"
        data={flattenedData}
        renderItem={({ item, index }) => {
          if (item.type === 'header') {
            return renderMonthHeader(item.data, item.count || 0, item.isFirst || false);
          }
          
          const milestoneItem = item.data;
          
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
              activeOpacity={0.7}
            >
              <MilestoneCard 
                milestoneType={milestoneType}
                details={milestoneItem}
                formatTimeAgo={formatTimeAgo}
              />
            </TouchableOpacity>
          );
        }}
        keyExtractor={(item, index) => 
          item.type === 'header' ? `header-${item.data}` : `milestone-${item.data.id}-${index}`
        }
        contentContainerStyle={styles.milestonesListContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
    padding: 40,
    minHeight: 300,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 260,
  },
  // Milestones Tab Styles
  milestonesContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  milestonesHeader: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,94,105,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '500',
  },
  milestonesListContent: {
    paddingBottom: 24,
  },
  monthHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  monthHeaderFirst: {
    paddingTop: 16,
  },
  monthHeaderContent: {
    flexDirection: 'column',
  },
  monthTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  monthText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  monthCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 10,
  },
  monthCountText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  monthDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    width: '100%',
  },
  milestoneItemCard: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  // Legacy styles for backwards compatibility
  monthHeader: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#000',
    marginTop: 8,
  },
  workoutsListSingleColumn: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
});
