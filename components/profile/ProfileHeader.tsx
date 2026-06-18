import React, { useState, useRef, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Platform, findNodeHandle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ACCENT_COLOR } from '@/constants/Colors';
import { formatCount } from '@/logic/formattingFunctions';
import { currentHype } from '@/logic/hype';
import { getOptimalImageUrl } from '@/utils/imageUtils';
import { ProfileImageViewer, ImagePosition } from './ProfileImageViewer';
import { BannerImageViewer, BannerPosition } from './BannerImageViewer';

const archetypeIcons = {
  'athlete': require('@/assets/images/athlete.png'),
  'bodybuilder': require('@/assets/images/bodybuilder.png'),
  'crossfitter': require('@/assets/images/crossfitter.png'),
  'generalist': require('@/assets/images/generalist.png'),
  'powerlifter': require('@/assets/images/powerlifter.png'),
};

interface ProfileHeaderProps {
  profileData: any;
  isOwnProfile: boolean;
  isFollowingStatus: boolean;
  isRequestPending: boolean;
  followActionLoading: boolean;
  hasBlockedUser: boolean;
  isBlockedByUser: boolean;
  displayablePosts: any[];
  followers: any[];
  following: any[];
  viewedProfileId: string;
  isPrivate: boolean;
  canGoBack: boolean;
  showBackButton: boolean;
  onBack: () => void;
  onSettings: () => void;
  onEditProfile: () => void;
  onMoreOptions: () => void;
  onOwnMoreOptions: () => void;
  onDirectMessage: () => void;
  onFollowAction: () => void;
  onArchetypeBadgePress: () => void;
  onFollowersPress: () => void;
  onFollowingPress: () => void;
  onHypePress: () => void;
  onViewProfileCard?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profileData,
  isOwnProfile,
  isFollowingStatus,
  isRequestPending,
  followActionLoading,
  hasBlockedUser,
  isBlockedByUser,
  displayablePosts,
  followers,
  following,
  viewedProfileId,
  isPrivate,
  canGoBack,
  showBackButton,
  onBack,
  onSettings,
  onEditProfile,
  onMoreOptions,
  onOwnMoreOptions,
  onDirectMessage,
  onFollowAction,
  onArchetypeBadgePress,
  onFollowersPress,
  onFollowingPress,
  onHypePress,
  onViewProfileCard,
}) => {
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imagePosition, setImagePosition] = useState<ImagePosition | null>(null);
  const profileImageRef = useRef<View>(null);

  const [bannerViewerVisible, setBannerViewerVisible] = useState(false);
  const [bannerPosition, setBannerPosition] = useState<BannerPosition | null>(null);
  const bannerRef = useRef<View>(null);

  const profileImageUrl = getOptimalImageUrl(
    profileData?.profileThumbnailUrl,
    profileData?.profileImageUrl
  ) || profileData?.profileImageUrl;

  // Use the full-resolution image for the viewer
  const fullResImageUrl = profileData?.profileImageUrl || profileImageUrl;

  // Banner image URL
  const bannerImageUrl = profileData?.bannerImageUrl || 
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80';

  const handleProfileImagePress = useCallback(() => {
    if (profileImageRef.current) {
      profileImageRef.current.measureInWindow((x, y, width, height) => {
        setImagePosition({ x, y, width, height });
        setImageViewerVisible(true);
      });
    } else {
      // Fallback if ref isn't available
      setImageViewerVisible(true);
    }
  }, []);

  const handleBannerPress = useCallback(() => {
    if (bannerRef.current) {
      bannerRef.current.measureInWindow((x, y, width, height) => {
        setBannerPosition({ x, y, width, height });
        setBannerViewerVisible(true);
      });
    } else {
      // Fallback if ref isn't available
      setBannerViewerVisible(true);
    }
  }, []);

  return (
    <View style={styles.headerSection}>
      {/* Banner Image */}
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={handleBannerPress}
        style={styles.bannerContainer}
      >
        <View ref={bannerRef} collapsable={false} style={styles.bannerImageWrapper}>
          <Image
            source={{ uri: bannerImageUrl }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        </View>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.2)']}
          locations={[0, 1]}
          style={styles.bannerGradient}
        />
        
        {/* Top Navigation Buttons */}
        <SafeAreaView style={styles.topNavigation}>
          {showBackButton && (
            <TouchableOpacity
              style={styles.navButton}
              onPress={onBack}
              activeOpacity={0.85}
            >
              <BlurView intensity={30} tint="dark" style={styles.navButtonBlur}>
                <Ionicons name="chevron-back" size={18} color="white" />
              </BlurView>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </TouchableOpacity>
      
      {/* Profile Info Section */}
      <View style={styles.profileInfoSection}>
        {/* Profile Image & Actions Row */}
        <View style={styles.profileTopRow}>
          {/* Profile Image */}
          <View style={styles.profileImageWrapper}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleProfileImagePress}
              style={styles.profileImageTouchable}
            >
              <View ref={profileImageRef} collapsable={false}>
                <Image
                  source={{ uri: profileImageUrl }}
                  style={styles.profileImage}
                />
              </View>
            </TouchableOpacity>
            {/* Archetype Badge */}
            {profileData?.archetype && (
              <TouchableOpacity 
                style={styles.archetypeBadge}
                activeOpacity={0.85}
                onPress={onArchetypeBadgePress}
              >
                <Image
                  source={archetypeIcons[profileData?.archetype?.toLowerCase() || 'generalist']}
                  style={styles.archetypeBadgeIcon}
                />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            {!isOwnProfile && profileData && (
              <>
                <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={onMoreOptions}
                  activeOpacity={0.85}
                >
                  <Ionicons name="ellipsis-horizontal" size={16} color="#FFF" />
                </TouchableOpacity>
                {!isBlockedByUser && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[
                      styles.followButtonNew,
                      hasBlockedUser
                        ? styles.blockedButtonStyle
                        : isFollowingStatus 
                          ? styles.followingButtonStyle 
                          : isRequestPending
                            ? styles.requestedButtonStyle
                            : styles.followButtonStyle,
                    ]}
                    onPress={onFollowAction}
                    disabled={followActionLoading || hasBlockedUser}
                  >
                    {followActionLoading ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={[
                        styles.followButtonTextNew,
                        (isFollowingStatus || isRequestPending) && styles.followButtonTextSecondary
                      ]}>
                        {hasBlockedUser 
                          ? "Blocked" 
                          : isFollowingStatus 
                            ? "Following" 
                            : isRequestPending 
                              ? "Requested" 
                              : "Follow"}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
            
            {isOwnProfile && (
              <>
                <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={onOwnMoreOptions}
                  activeOpacity={0.85}
                >
                  <Ionicons name="ellipsis-horizontal" size={16} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={onSettings}
                  activeOpacity={0.85}
                >
                  <Ionicons name="settings-outline" size={16} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editProfileButton}
                  onPress={onEditProfile}
                  activeOpacity={0.85}
                >
                  <Text style={styles.editProfileButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        
        {/* Name & Username */}
        <View style={styles.nameSection}>
          <Text style={styles.displayName}>{profileData?.displayName || 'User'}</Text>
          <Text style={styles.username}>@{profileData?.username || 'username'}</Text>
        </View>
        
        {/* Bio */}
        {profileData?.bio && (
          <Text style={styles.bio}>{profileData.bio}</Text>
        )}
        
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statItemNew}
            activeOpacity={0.85}
            onPress={onFollowingPress}
            disabled={(isPrivate && !isOwnProfile) || isBlockedByUser}
          >
            <Text style={styles.statValueNew}>
              {isBlockedByUser ? "••" : formatCount(profileData?.followingCount ?? following.length)}
            </Text>
            <Text style={styles.statLabelNew}>Following</Text>
          </TouchableOpacity>
          
          <View style={styles.statDivider} />
          
          <TouchableOpacity
            style={styles.statItemNew}
            activeOpacity={0.85}
            onPress={onFollowersPress}
            disabled={(isPrivate && !isOwnProfile) || isBlockedByUser}
          >
            <Text style={styles.statValueNew}>
              {isBlockedByUser ? "••" : formatCount(profileData?.followerCount ?? followers.length)}
            </Text>
            <Text style={styles.statLabelNew}>Followers</Text>
          </TouchableOpacity>
          
          <View style={styles.statDivider} />
          
          <TouchableOpacity
            style={styles.statItemNew}
            activeOpacity={0.85}
            onPress={onHypePress}
          >
            <Text style={styles.statValueNew}>
              {formatCount(currentHype(profileData?.hypeByDay))}
            </Text>
            <View style={styles.hypeLabelRow}>
              <Text style={styles.statLabelNew}>Hype</Text>
              <Ionicons name="information-circle-outline" size={12} color="rgba(255,255,255,0.5)" />
            </View>
          </TouchableOpacity>
        </View>
      </View>
      {/* Profile Image Viewer Modal */}
      <ProfileImageViewer
        visible={imageViewerVisible}
        imageUrl={fullResImageUrl}
        onClose={() => setImageViewerVisible(false)}
        originPosition={imagePosition}
      />
      {/* Banner Image Viewer Modal */}
      <BannerImageViewer
        visible={bannerViewerVisible}
        imageUrl={bannerImageUrl}
        onClose={() => setBannerViewerVisible(false)}
        originPosition={bannerPosition}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  headerSection: {
    width: '100%',
  },
  bannerContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  bannerImageWrapper: {
    width: '100%',
    height: '100%',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  bannerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
  },
  topNavigation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  navButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    top: -5,
    marginLeft: 5,
  },
  navButtonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  navSpacer: {
    flex: 1,
  },
  profileInfoSection: {
    paddingHorizontal: 16,
    paddingTop: 0,
    marginTop: -50,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImageTouchable: {
    borderRadius: 45,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#1C1C1E',
  },
  archetypeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1C1C1E',
    borderWidth: 2.5,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  archetypeBadgeIcon: {
    width: 18,
    height: 18,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 60,
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followButtonNew: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonStyle: {
    backgroundColor: ACCENT_COLOR,
  },
  followingButtonStyle: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  requestedButtonStyle: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  blockedButtonStyle: {
    backgroundColor: 'rgba(255,59,48,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
  },
  followButtonTextNew: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  followButtonTextSecondary: {
    color: 'rgba(255,255,255,0.8)',
  },
  editProfileButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  editProfileButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  nameSection: {
    marginTop: -8,
    marginBottom: 8,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: -0.3,
  },
  username: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 4,
    marginBottom: 4,
    gap: 12,
  },
  statItemNew: {
    alignItems: 'center',
    minWidth: 70,
  },
  statValueNew: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  statLabelNew: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 3,
    fontWeight: '500',
  },
  hypeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 4,
  },
});
