import React from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, Linking, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VERIFIED_PLATFORMS, type PlatformKey } from '@/utils/socialLinkValidation';
import { useAuth } from '@/context/AuthContext';

interface SocialLinksDisplayProps {
  socialLinks?: {
    [K in PlatformKey]?: string;
  } & {
    customUrl?: string;
    customLabel?: string;
    showLinksToFollowersOnly?: boolean;
  };
  profileUserId?: string;
  isFollowing?: boolean;
}

export const SocialLinksDisplay: React.FC<SocialLinksDisplayProps> = ({ 
  socialLinks, 
  profileUserId,
  isFollowing 
}) => {
  const { currentUser } = useAuth();
  
  if (!socialLinks) return null;

  // Check if links should be visible
  const isOwnProfile = currentUser?.uid === profileUserId;
  const shouldShowLinks = isOwnProfile || !socialLinks.showLinksToFollowersOnly || isFollowing;

  if (!shouldShowLinks) {
    return null;
  }

  const handleVerifiedLinkPress = async (url: string, platform: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', `Cannot open ${platform} link`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to open ${platform} link`);
    }
  };

  const handleCustomLinkPress = async (url: string, label: string) => {
    Alert.alert(
      'External Link Warning',
      'This is not a verified URL. Only visit sites you trust.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Link',
          onPress: async () => {
            try {
              const canOpen = await Linking.canOpenURL(url);
              if (canOpen) {
                await Linking.openURL(url);
              } else {
                Alert.alert('Error', 'Cannot open this link');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to open link');
            }
          }
        }
      ]
    );
  };

  const verifiedLinks = Object.entries(VERIFIED_PLATFORMS)
    .filter(([key]) => socialLinks[key as PlatformKey])
    .map(([key, platform]) => ({
      key,
      platform,
      url: socialLinks[key as PlatformKey]!
    }));

  const hasCustomLink = socialLinks.customUrl;
  const hasAnyLinks = verifiedLinks.length > 0 || hasCustomLink;

  if (!hasAnyLinks) return null;

  return (
    <View style={styles.container}>
      <View style={styles.linksRow}>
        {/* Verified Platform Links */}
        {verifiedLinks.map(({ key, platform, url }) => (
          <TouchableOpacity
            key={key}
            style={styles.linkButton}
            onPress={() => handleVerifiedLinkPress(url, platform.name)}
          >
            <Ionicons 
              name={platform.icon as any} 
              size={24} 
              color="#007AFF" 
            />
          </TouchableOpacity>
        ))}
        
        {/* Custom Link */}
        {hasCustomLink && (
          <TouchableOpacity
            style={styles.customLinkButton}
            onPress={() => handleCustomLinkPress(
              socialLinks.customUrl!,
              socialLinks.customLabel || 'Custom Link'
            )}
          >
            <Text style={styles.customLinkText}>
              {socialLinks.customLabel || 'Website'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 8,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  linkButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  customLinkButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  customLinkText: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: '600',
  },
});
