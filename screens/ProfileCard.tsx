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
const CARD_WIDTH = SCREEN_WIDTH - 56;

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
      <View style={[styles.cardContainer, { paddingTop: insets.top }]}> 
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
              <Ionicons name="grid-outline" size={16} color={ACCENT_COLOR} />
              <Text style={styles.secondaryStatValue}>
                {formatCount(profileData.postCount)}
              </Text>
              <Text style={styles.secondaryStatLabel}>Posts</Text>
            </View>
            <View style={styles.secondaryStatItem}>
              <Ionicons name="trophy-outline" size={16} color={ACCENT_COLOR} />
              <Text style={styles.secondaryStatValue}>
                {formatCount(profileData.milestoneCount)}
              </Text>
              <Text style={styles.secondaryStatLabel}>Milestones</Text>
            </View>
            <View style={styles.secondaryStatItem}>
              <Ionicons name="barbell-outline" size={16} color={ACCENT_COLOR} />
              <Text style={styles.secondaryStatValue}>
                {formatCount(profileData.workoutsCreated)}
              </Text>
              <Text style={styles.secondaryStatLabel}>Created</Text>
            </View>
            <View style={styles.secondaryStatItem}>
              <Ionicons name="flame-outline" size={16} color={ACCENT_COLOR} />
              <Text style={styles.secondaryStatValue}>
                {formatCount(profileData.workoutsLogged)}
              </Text>
              <Text style={styles.secondaryStatLabel}>Logged</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            <View style={styles.joinDateSection}>
              <Ionicons name="calendar-outline" size={14} color="#666" />
              <Text style={styles.joinDateText}>
                Member since {formatJoinDate(profileData.createdAt)}
              </Text>
            </View>
            
            {/* QR Code */}
            <View style={styles.qrCodeSection}>
              <View style={styles.qrCodeWrapper}>
                <Image
                  source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=hlthy://profile/${profileData.id}&bgcolor=1a1a1a&color=ffffff` }}
                  style={styles.qrCodeImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.qrCodeHint}>Scan profile</Text>
            </View>
          </View>

          {/* Branding */}
          <View style={styles.brandingSection}>
            <Text style={styles.brandingText}>hlthy</Text>
          </View>
        </LinearGradient>
      </View>
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
  cardContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: CARD_WIDTH,
    maxWidth: 400,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: ACCENT_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  cardBorderGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2.5,
    borderColor: ACCENT_COLOR,
  },
  archetypeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  archetypeBadgeIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  nameSection: {
    alignItems: 'center',
    marginBottom: 14,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 3,
  },
  username: {
    fontSize: 14,
    color: '#888',
    marginBottom: 7,
  },
  archetypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  archetypeIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
    marginRight: 5,
  },
  archetypeText: {
    fontSize: 12,
    color: '#AAA',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 12,
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
    fontSize: 19,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  secondaryStatItem: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  secondaryStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 4,
    marginBottom: 1,
  },
  secondaryStatLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  joinDateSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinDateText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 5,
  },
  qrCodeSection: {
    alignItems: 'center',
  },
  qrCodeWrapper: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  qrCodeImage: {
    width: 64,
    height: 64,
  },
  qrCodeHint: {
    fontSize: 9,
    color: '#555',
    marginTop: 4,
  },
  brandingSection: {
    alignItems: 'center',
    marginTop: 12,
  },
  brandingText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.12)',
    letterSpacing: 2.5,
  },
});
