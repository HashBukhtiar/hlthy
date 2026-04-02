import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { CustomSelector } from '@/components/CustomSelector';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { SettingsRepository } from '@/features/settings/infra/settingsRepository';
import {
  validatePlatformUrl,
  validateCustomUrl,
  usernameToUrl,
  VERIFIED_PLATFORMS,
  type PlatformKey,
} from '@/utils/socialLinkValidation';

type SocialLinksState = {
  instagram: string;
  facebook: string;
  twitter: string;
  tiktok: string;
  youtube: string;
  linkedin: string;
  spotify: string;
  snapchat: string;
  twitch: string;
  github: string;
  customUrl: string;
  customLabel: string;
  showLinksToFollowersOnly: boolean;
};

const PLATFORM_CONFIG: Record<PlatformKey, { color: string; bg: string; icon: string }> = {
  instagram: { color: '#E1306C', bg: 'rgba(225,48,108,0.15)', icon: 'logo-instagram' },
  facebook:  { color: '#1877F2', bg: 'rgba(24,119,242,0.15)',  icon: 'logo-facebook' },
  twitter:   { color: '#1DA1F2', bg: 'rgba(29,161,242,0.15)', icon: 'logo-twitter' },
  tiktok:    { color: '#FE2C55', bg: 'rgba(254,44,85,0.15)',   icon: 'logo-tiktok' },
  youtube:   { color: '#FF0000', bg: 'rgba(255,0,0,0.15)',     icon: 'logo-youtube' },
  linkedin:  { color: '#0A66C2', bg: 'rgba(10,102,194,0.15)', icon: 'logo-linkedin' },
  spotify:   { color: '#1DB954', bg: 'rgba(29,185,84,0.15)',  icon: 'musical-notes' },
  snapchat:  { color: '#FFFC00', bg: 'rgba(255,252,0,0.15)',   icon: 'logo-snapchat' },
  twitch:    { color: '#9146FF', bg: 'rgba(145,70,255,0.15)', icon: 'logo-twitch' },
  github:    { color: '#E6EDF3', bg: 'rgba(230,237,243,0.12)', icon: 'logo-github' },
};

const EMPTY_LINKS: SocialLinksState = {
  instagram: '', facebook: '', twitter: '', tiktok: '',
  youtube: '', linkedin: '', spotify: '', snapchat: '',
  twitch: '', github: '', customUrl: '', customLabel: '',
  showLinksToFollowersOnly: false,
};

function linksFromProfile(socialLinks: any): SocialLinksState {
  if (!socialLinks) return { ...EMPTY_LINKS };
  return {
    instagram: socialLinks.instagram || '',
    facebook: socialLinks.facebook || '',
    twitter: socialLinks.twitter || '',
    tiktok: socialLinks.tiktok || '',
    youtube: socialLinks.youtube || '',
    linkedin: socialLinks.linkedin || '',
    spotify: socialLinks.spotify || '',
    snapchat: socialLinks.snapchat || '',
    twitch: socialLinks.twitch || '',
    github: socialLinks.github || '',
    customUrl: socialLinks.customUrl || '',
    customLabel: socialLinks.customLabel || '',
    showLinksToFollowersOnly: socialLinks.showLinksToFollowersOnly || false,
  };
}

interface PlatformRowProps {
  platformKey: PlatformKey;
  platform: typeof VERIFIED_PLATFORMS[PlatformKey];
  config: typeof PLATFORM_CONFIG[PlatformKey];
  value: string;
  isLast: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
}

function PlatformRow({ platformKey, platform, config, value, isLast, onChange, onBlur }: PlatformRowProps) {
  const isValid = !!value && validatePlatformUrl(platformKey, value);
  const isInvalid = !!value && !validatePlatformUrl(platformKey, value);

  return (
    <View style={[styles.platformRow, !isLast && styles.platformRowBorder]}>
      <View style={styles.platformMeta}>
        <View style={[styles.iconBadge, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon as any} size={17} color={config.color} />
        </View>
        <Text style={styles.platformName}>{platform.name}</Text>
        {isValid && (
          <Ionicons name="checkmark-circle" size={16} color="#30D158" style={styles.checkmark} />
        )}
      </View>
      <View style={[styles.inputWrapper, isInvalid && styles.inputWrapperError]}>
        <TextInput
          style={styles.platformInput}
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          placeholder={platform.placeholder}
          placeholderTextColor="#3A3A3C"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="done"
        />
        {!!value && (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={17} color="#48484A" />
          </TouchableOpacity>
        )}
      </View>
      {isInvalid && (
        <Text style={styles.errorText}>Invalid {platform.name} URL format</Text>
      )}
    </View>
  );
}

export default function EditProfileSocialLinks() {
  const { userProfile, currentUser, refreshUserProfile } = useAuth();
  const router = useRouter();

  const [links, setLinks] = useState<SocialLinksState>(EMPTY_LINKS);
  const [initialLinks, setInitialLinks] = useState<SocialLinksState>(EMPTY_LINKS);
  const [isSaving, setIsSaving] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  useEffect(() => {
    if (userProfile) {
      const loaded = linksFromProfile(userProfile.socialLinks);
      setLinks(loaded);
      setInitialLinks(loaded);
    }
  }, [userProfile]);

  const hasChanges = JSON.stringify(links) !== JSON.stringify(initialLinks);

  const updateLink = useCallback((key: keyof SocialLinksState, value: any) => {
    setLinks(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleBlur = useCallback((platform: PlatformKey) => {
    const current = links[platform];
    if (!current) return;
    const formatted = usernameToUrl(platform, current);
    if (formatted !== current) updateLink(platform, formatted);
  }, [links, updateLink]);

  const handleSave = useCallback(async () => {
    if (!currentUser || !hasChanges) return;
    setIsSaving(true);
    try {
      await SettingsRepository.updateUser(currentUser.uid, { socialLinks: links });
      await refreshUserProfile();
      setInitialLinks(links);
      router.back();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save social links: ' + (error?.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  }, [currentUser, hasChanges, links, refreshUserProfile, router]);

  const platformEntries = Object.entries(VERIFIED_PLATFORMS) as [PlatformKey, typeof VERIFIED_PLATFORMS[PlatformKey]][];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Social Links</Text>
        <TouchableOpacity
          style={[styles.saveButton, (!hasChanges || isSaving) && styles.saveButtonDim]}
          onPress={handleSave}
          disabled={!hasChanges || isSaving}
          activeOpacity={0.7}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FF2D55" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        Connect your profiles so others can find you across platforms.
      </Text>

      {/* Platform list */}
      <Text style={styles.sectionHeader}>PLATFORMS</Text>
      <View style={styles.card}>
        {platformEntries.map(([key, platform], index) => (
          <PlatformRow
            key={key}
            platformKey={key}
            platform={platform}
            config={PLATFORM_CONFIG[key]}
            value={links[key]}
            isLast={index === platformEntries.length - 1}
            onChange={(v) => updateLink(key, v)}
            onBlur={() => handleBlur(key)}
          />
        ))}
      </View>

      {/* Custom link */}
      <Text style={styles.sectionHeader}>CUSTOM LINK</Text>
      <View style={styles.card}>
        {/* Label row */}
        <View style={styles.customRow}>
          <View style={styles.platformMeta}>
            <View style={[styles.iconBadge, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              <Ionicons name="bookmark-outline" size={17} color="#8E8E93" />
            </View>
            <Text style={styles.platformName}>Label</Text>
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.platformInput}
              value={links.customLabel}
              onChangeText={(v) => updateLink('customLabel', v)}
              placeholder="e.g. My Portfolio"
              placeholderTextColor="#3A3A3C"
              maxLength={30}
              returnKeyType="done"
            />
            {!!links.customLabel && (
              <TouchableOpacity onPress={() => updateLink('customLabel', '')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={17} color="#48484A" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* URL row */}
        <View style={styles.customRow}>
          <View style={styles.platformMeta}>
            <View style={[styles.iconBadge, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              <Ionicons name="globe-outline" size={17} color="#8E8E93" />
            </View>
            <Text style={styles.platformName}>URL</Text>
            {!!links.customUrl && validateCustomUrl(links.customUrl) && (
              <Ionicons name="checkmark-circle" size={16} color="#30D158" style={styles.checkmark} />
            )}
          </View>
          <View style={[styles.inputWrapper, !!(links.customUrl && !validateCustomUrl(links.customUrl)) && styles.inputWrapperError]}>
            <TextInput
              style={styles.platformInput}
              value={links.customUrl}
              onChangeText={(v) => updateLink('customUrl', v)}
              placeholder="https://example.com"
              placeholderTextColor="#3A3A3C"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
            />
            {!!links.customUrl && (
              <TouchableOpacity onPress={() => updateLink('customUrl', '')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={17} color="#48484A" />
              </TouchableOpacity>
            )}
          </View>
          {!!(links.customUrl && !validateCustomUrl(links.customUrl)) && (
            <Text style={styles.errorText}>Enter a valid URL starting with https://</Text>
          )}
        </View>
      </View>

      {/* Privacy */}
      <Text style={styles.sectionHeader}>PRIVACY</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setPrivacyModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.toggleLeft}>
            <Text style={styles.toggleLabel}>Link Visibility</Text>
            <Text style={styles.toggleHelper}>Only your followers can see your social links</Text>
          </View>
          <View style={styles.dropdownRight}>
            <Text style={styles.dropdownValue}>
              {links.showLinksToFollowersOnly ? 'Followers Only' : 'Public'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          </View>
        </TouchableOpacity>
      </View>

      <CustomSelector
        items={[
          { label: 'Public', value: 'public', icon: 'globe-outline', description: 'Anyone can see your social links' },
          { label: 'Followers Only', value: 'followers', icon: 'people-outline', description: 'Only your followers can see your social links' },
        ]}
        value={links.showLinksToFollowersOnly ? 'followers' : 'public'}
        onSelect={(value) => updateLink('showLinksToFollowersOnly', value === 'followers')}
        title="Link Visibility"
        icon="eye-outline"
        modalVisible={privacyModalVisible}
        setModalVisible={setPrivacyModalVisible}
        variant="fullWidth"
      />

      <View style={styles.footer} />
    </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  saveButton: {
    minWidth: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDim: {
    opacity: 0.35,
  },
  saveButtonText: {
    color: '#FF2D55',
    fontSize: 17,
    fontWeight: '600',
  },
  subtitle: {
    color: '#8E8E93',
    fontSize: 13,
    lineHeight: 18,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  sectionHeader: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginHorizontal: 20,
    marginBottom: 8,
    marginTop: 24,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    overflow: 'hidden',
  },
  platformRow: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
  },
  platformRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  platformMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  platformName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  checkmark: {
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputWrapperError: {
    borderColor: '#FF3B30',
  },
  platformInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    padding: 0,
    margin: 0,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 6,
  },
  customRow: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#2C2C2E',
    marginHorizontal: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleLeft: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 3,
  },
  toggleHelper: {
    color: '#8E8E93',
    fontSize: 13,
    lineHeight: 17,
  },
  dropdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dropdownValue: {
    color: '#8E8E93',
    fontSize: 15,
  },
  footer: {
    height: 48,
  },
});
