import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useAuth } from '@/context/AuthContext';
import { ACCENT_COLOR } from '@/constants/Colors';
import { formatCount } from '@/logic/formattingFunctions';
import { getOptimalImageUrl } from '@/utils/imageUtils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.75;

const archetypeIcons: Record<string, any> = {
  'athlete': require('@/assets/images/athlete.png'),
  'bodybuilder': require('@/assets/images/bodybuilder.png'),
  'crossfitter': require('@/assets/images/crossfitter.png'),
  'generalist': require('@/assets/images/generalist.png'),
  'powerlifter': require('@/assets/images/powerlifter.png'),
};

interface ProfileCardData {
  id: string;
  displayName: string;
  username: string;
  profileImageUrl: string;
  archetype: string;
  followerCount: number;
  followingCount: number;
  totalLikes: number;
  postCount: number;
  milestoneCount: number;
  workoutsCreated: number;
  workoutsLogged: number;
  createdAt: Date | null;
}

interface ProfileCardProps {
  userId?: string;
}

export default function ProfileCard({ userId: propUserId }: ProfileCardProps) {
  const { userId: paramUserId } = useLocalSearchParams<{ userId: string }>();
  const userId = propUserId || paramUserId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser, userProfile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileCardData | null>(null);

  const isOwnProfile = !userId || userId === currentUser?.uid;

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        const targetUserId = userId || currentUser?.uid;
        if (!targetUserId) {
          setLoading(false);
          return;
        }

        // If viewing own profile, use cached data if available
        if (isOwnProfile && userProfile) {
          setProfileData({
            id: userProfile.uid,
            displayName: userProfile.displayName || 'User',
            username: userProfile.username || 'unknown',
            profileImageUrl: getOptimalImageUrl(
              userProfile.profileThumbnailUrl,
              userProfile.profileImageUrl
            ) || 'https://via.placeholder.com/150',
            archetype: userProfile.archetype || 'generalist',
            followerCount: userProfile.followerCount || userProfile.stats?.followerCount || 0,
            followingCount: userProfile.followingCount || userProfile.stats?.followingCount || 0,
            totalLikes: userProfile.stats?.totalLikes || 0,
            postCount: userProfile.stats?.postCount || 0,
            milestoneCount: userProfile.stats?.milestoneCount || 0,
            workoutsCreated: userProfile.stats?.workoutCount || 0,
            workoutsLogged: userProfile.stats?.workoutsLogged || 0,
            createdAt: userProfile.createdAt?.toDate?.() || null,
          });
          setLoading(false);
          return;
        }

        // Fetch from Firestore
        const userRef = doc(db, 'users', targetUserId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setProfileData({
            id: userSnap.id,
            displayName: userData.displayName || 'User',
            username: userData.username || 'unknown',
            profileImageUrl: getOptimalImageUrl(
              userData.profileThumbnailUrl,
              userData.profileImageUrl
            ) || 'https://via.placeholder.com/150',
            archetype: userData.archetype || 'generalist',
            followerCount: userData.followerCount || userData.stats?.followerCount || 0,
            followingCount: userData.followingCount || userData.stats?.followingCount || 0,
            totalLikes: userData.stats?.totalLikes || 0,
            postCount: userData.stats?.postCount || 0,
            milestoneCount: userData.stats?.milestoneCount || 0,
            workoutsCreated: userData.stats?.workoutCount || 0,
            workoutsLogged: userData.stats?.workoutsLogged || 0,
            createdAt: userData.createdAt?.toDate?.() || null,
          });
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [userId, currentUser, userProfile, isOwnProfile]);

  const formatJoinDate = (date: Date | null) => {
    if (!date) return 'Unknown';
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const capitalizeArchetype = (archetype: string) => {
    return archetype
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT_COLOR} />
      </View>
    );
  }

  if (!profileData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Unable to load profile</Text>
        <TouchableOpacity
          style={styles.backButtonError}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.background}>
        <LinearGradient
          colors={['#0a0a0a', '#111111', '#0a0a0a']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <BlurView intensity={40} tint="dark" style={styles.closeButtonBlur}>
            <Ionicons name="close" size={20} color="#FFF" />
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Card</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Card */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={['#1a1a1a', '#141414', '#0f0f0f']}
            style={styles.card}
          >
            {/* Card Border Glow */}
            <View style={styles.cardBorderGlow} />
            
            {/* Profile Image Section */}
            <View style={styles.profileImageSection}>
              <View style={styles.profileImageWrapper}>
                <Image
                  source={{ uri: profileData.profileImageUrl }}
                  style={styles.profileImage}
                />
                {/* Archetype Badge */}
                <View style={styles.archetypeBadge}>
                  <Image
                    source={archetypeIcons[profileData.archetype?.toLowerCase() || 'generalist']}
                    style={styles.archetypeBadgeIcon}
                  />
                </View>
              </View>
            </View>

            {/* Name & Username */}
            <View style={styles.nameSection}>
              <Text style={styles.displayName}>{profileData.displayName}</Text>
              <Text style={styles.username}>@{profileData.username}</Text>
              <View style={styles.archetypeRow}>
                <Image
                  source={archetypeIcons[profileData.archetype?.toLowerCase() || 'generalist']}
                  style={styles.archetypeIcon}
                />
                <Text style={styles.archetypeText}>
                  {capitalizeArchetype(profileData.archetype)}
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Primary Stats Row */}
            <View style={styles.primaryStatsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {formatCount(profileData.followingCount)}
                </Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {formatCount(profileData.followerCount)}
                </Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {formatCount(profileData.totalLikes)}
                </Text>
                <Text style={styles.statLabel}>Hype</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Secondary Stats Grid */}
            <View style={styles.secondaryStatsGrid}>
              <View style={styles.secondaryStatItem}>
                <Ionicons name="grid-outline" size={18} color={ACCENT_COLOR} />
                <Text style={styles.secondaryStatValue}>
                  {formatCount(profileData.postCount)}
                </Text>
                <Text style={styles.secondaryStatLabel}>Posts</Text>
              </View>
              <View style={styles.secondaryStatItem}>
                <Ionicons name="trophy-outline" size={18} color={ACCENT_COLOR} />
                <Text style={styles.secondaryStatValue}>
                  {formatCount(profileData.milestoneCount)}
                </Text>
                <Text style={styles.secondaryStatLabel}>Milestones</Text>
              </View>
              <View style={styles.secondaryStatItem}>
                <Ionicons name="barbell-outline" size={18} color={ACCENT_COLOR} />
                <Text style={styles.secondaryStatValue}>
                  {formatCount(profileData.workoutsCreated)}
                </Text>
                <Text style={styles.secondaryStatLabel}>Created</Text>
              </View>
              <View style={styles.secondaryStatItem}>
                <Ionicons name="flame-outline" size={18} color={ACCENT_COLOR} />
                <Text style={styles.secondaryStatValue}>
                  {formatCount(profileData.workoutsLogged)}
                </Text>
                <Text style={styles.secondaryStatLabel}>Logged</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Join Date */}
            <View style={styles.joinDateSection}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.joinDateText}>
                Member since {formatJoinDate(profileData.createdAt)}
              </Text>
            </View>

            {/* QR Code Section */}
            <View style={styles.qrCodeSection}>
              <View style={styles.qrCodeWrapper}>
                {/* Sample QR Code - Using a placeholder pattern */}
                <View style={styles.qrCodePlaceholder}>
                  <Image
                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=hlthy://profile/${profileData.id}&bgcolor=1a1a1a&color=ffffff` }}
                    style={styles.qrCodeImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
              <Text style={styles.qrCodeHint}>Scan to view profile</Text>
            </View>

            {/* Branding */}
            <View style={styles.brandingSection}>
              <Text style={styles.brandingText}>hlthy</Text>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorText: {
    color: '#666',
    fontSize: 16,
    marginBottom: 16,
  },
  backButtonError: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  closeButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
  headerSpacer: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    alignItems: 'center',
  },
  cardContainer: {
    width: CARD_WIDTH,
    borderRadius: 24,
    overflow: 'hidden',
    // Shadow
    shadowColor: ACCENT_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  card: {
    width: '100%',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardBorderGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: ACCENT_COLOR,
  },
  archetypeBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  archetypeBadgeIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  nameSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  username: {
    fontSize: 15,
    color: '#888',
    marginBottom: 8,
  },
  archetypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  archetypeIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
    marginRight: 6,
  },
  archetypeText: {
    fontSize: 13,
    color: '#AAA',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 16,
  },
  primaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  secondaryStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  secondaryStatItem: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  secondaryStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 6,
    marginBottom: 2,
  },
  secondaryStatLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  joinDateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  joinDateText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  qrCodeSection: {
    alignItems: 'center',
    marginTop: 8,
  },
  qrCodeWrapper: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  qrCodePlaceholder: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  qrCodeImage: {
    width: 120,
    height: 120,
  },
  qrCodeHint: {
    fontSize: 11,
    color: '#555',
    marginTop: 10,
  },
  brandingSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  brandingText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.15)',
    letterSpacing: 2,
  },
});
