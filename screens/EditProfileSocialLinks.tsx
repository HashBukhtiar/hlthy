import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { SettingsItem } from '@/components/settings/SettingsItem';
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

export default function EditProfileSocialLinks() {
  const { userProfile, currentUser, refreshUserProfile } = useAuth();
  const router = useRouter();

  const [links, setLinks] = useState<SocialLinksState>(EMPTY_LINKS);
  const [initialLinks, setInitialLinks] = useState<SocialLinksState>(EMPTY_LINKS);
  const [isSaving, setIsSaving] = useState(false);

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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

      {/* Platforms */}
      <Text style={styles.sectionHeader}>PLATFORMS</Text>
      <View style={styles.card}>
        {Object.entries(VERIFIED_PLATFORMS).map(([key, platform], index, arr) => {
          const platformKey = key as PlatformKey;
          const value = links[platformKey];
          const hasValue = !!value;
          const isInvalid = hasValue && !validatePlatformUrl(platformKey, value);
          return (
            <View key={key} style={index < arr.length - 1 ? styles.itemBorder : undefined}>
              <SettingsItem
                type="input"
                label={platform.name}
                value={value}
                onValueChange={(v) => updateLink(platformKey, v)}
                onBlur={() => handleBlur(platformKey)}
                placeholder={platform.placeholder}
                helperText={isInvalid ? `Invalid ${platform.name} URL format` : 'Enter full URL or just username'}
                error={isInvalid}
                fullWidth
              />
            </View>
          );
        })}
      </View>

      {/* Custom Link */}
      <Text style={styles.sectionHeader}>CUSTOM LINK</Text>
      <View style={styles.card}>
        <View style={styles.itemBorder}>
          <SettingsItem
            type="input"
            label="Label"
            value={links.customLabel}
            onValueChange={(v) => updateLink('customLabel', v)}
            placeholder="My Website"
            helperText="Label shown to other users (max 30 characters)"
            fullWidth
          />
        </View>
        <SettingsItem
          type="input"
          label="URL"
          value={links.customUrl}
          onValueChange={(v) => updateLink('customUrl', v)}
          placeholder="https://example.com"
          helperText={
            links.customUrl && !validateCustomUrl(links.customUrl)
              ? 'Invalid URL format'
              : 'Users will see a warning before opening this link'
          }
          error={!!(links.customUrl && !validateCustomUrl(links.customUrl))}
          fullWidth
        />
      </View>

      {/* Privacy */}
      <Text style={styles.sectionHeader}>PRIVACY</Text>
      <View style={styles.card}>
        <SettingsItem
          type="toggle"
          label="Followers Only"
          value={links.showLinksToFollowersOnly}
          onValueChange={(v) => updateLink('showLinksToFollowersOnly', v)}
          helperText="Only your followers can see your social links"
        />
      </View>

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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDim: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: '#FF2D55',
    fontSize: 17,
    fontWeight: '600',
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
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  itemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
    paddingBottom: 4,
    marginBottom: 4,
  },
  footer: {
    height: 40,
  },
});
