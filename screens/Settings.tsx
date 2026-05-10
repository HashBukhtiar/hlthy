import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { SettingsRepository } from '@/features/settings/infra/settingsRepository';
import { SettingsModals } from '@/components/settings/SettingsModals';
import { getFullVersionString } from '@/utils/appVersion';
import { getOptimalImageUrl } from '@/utils/imageUtils';
import { useSettingsHandlers } from '@/hooks/useSettingsHandlers';
import { UserSettings } from '@/types/settings';
import { generateSettingsInsights, calculatePrivacyLevel } from '@/utils/settingsAnalytics';

const privacyOptions = [
  { label: 'Public', value: 'public', icon: 'earth', description: 'Anyone can see your profile' },
  { label: 'Private', value: 'private', icon: 'lock-closed', description: 'Only your followers can see your profile' },
];
const permissionOptions = [
  { label: 'Everyone', value: 'everyone', icon: 'globe' },
  { label: 'Followers Only', value: 'followers', icon: 'people' },
];
const themeOptions = [
  { label: 'Light', value: 'light', icon: 'sunny' },
  { label: 'Dark', value: 'dark', icon: 'moon' },
  { label: 'System', value: 'system', icon: 'phone-portrait' },
];
const languageOptions = [{ label: 'English', value: 'en', icon: 'flag' }];

const archetypeData = [
  { label: 'Athlete', value: 'athlete', image: require('@/assets/images/athlete.png'), description: 'Focused on athletic performance' },
  { label: 'Bodybuilder', value: 'bodybuilder', image: require('@/assets/images/bodybuilder.png'), description: 'Building muscle mass and definition' },
  { label: 'Crossfitter', value: 'crossfitter', image: require('@/assets/images/crossfitter.png'), description: 'Functional fitness and varied workouts' },
  { label: 'Generalist', value: 'generalist', image: require('@/assets/images/generalist.png'), description: 'Well-rounded fitness approach' },
  { label: 'Powerlifter', value: 'powerlifter', image: require('@/assets/images/powerlifter.png'), description: 'Maximum strength in core lifts' },
];

const visibilityLabel: Record<string, string> = { public: 'Public', private: 'Private' };
const messageLabel: Record<string, string> = { everyone: 'Everyone', followers: 'Followers Only' };
const weightLabel: Record<string, string> = { metric: 'Metric (kg)', imperial: 'Imperial (lbs)' };
const distanceLabel: Record<string, string> = { metric: 'Metric (km)', imperial: 'Imperial (mi)' };

export default function Settings() {
  const router = useRouter();
  const { userProfile, currentUser, refreshUserProfile } = useAuth();

  // Immediate-save settings state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'private'>('public');
  const [messagePermission, setMessagePermission] = useState<'everyone' | 'followers'>('everyone');
  const [weightUnit, setWeightUnit] = useState<'metric' | 'imperial'>('metric');
  const [distanceUnit, setDistanceUnit] = useState<'metric' | 'imperial'>('metric');

  const [saving, setSaving] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [lastModalAction, setLastModalAction] = useState(0);
  const MODAL_DEBOUNCE_MS = 300;

  // Privacy analytics state
  const [insights, setInsights] = useState<string[]>([]);
  const [privacyLevel, setPrivacyLevel] = useState<'open' | 'moderate' | 'strict'>('moderate');

  // Load from profile
  useEffect(() => {
    if (userProfile) {
      setTwoFactorEnabled(userProfile.twoFactorEnabled || false);
      setProfileVisibility(userProfile.profileVisibility || 'public');
      setMessagePermission(userProfile.messagePermission || 'everyone');
      setWeightUnit(userProfile.units?.weight || 'metric');
      setDistanceUnit(userProfile.units?.distance || 'metric');
    }
  }, [userProfile]);

  // Full settings snapshot — used by export/import/restore/reset handlers
  const fullSettings = useMemo<Partial<UserSettings>>(() => ({
    displayName: userProfile?.displayName || '',
    bio: userProfile?.bio || '',
    archetype: userProfile?.archetype || '',
    profileVisibility,
    messagePermission,
    theme: (userProfile?.theme as any) || 'dark',
    language: (userProfile?.language as any) || 'en',
    units: { weight: weightUnit, distance: distanceUnit },
    notifications: {
      newFollowers: userProfile?.notifications?.newFollowers ?? true,
      likesAndComments: userProfile?.notifications?.likesAndComments ?? true,
      directMessages: userProfile?.notifications?.directMessages ?? true,
      followRequestAccepted: userProfile?.notifications?.followRequestAccepted ?? true,
      taggedInComments: userProfile?.notifications?.taggedInComments ?? true,
      mentionedInReplies: userProfile?.notifications?.mentionedInReplies ?? true,
      mentions: userProfile?.notifications?.mentions ?? true,
    },
    twoFactorEnabled,
    dateOfBirth: userProfile?.dateOfBirth as any,
    socialLinks: userProfile?.socialLinks as any,
  }), [profileVisibility, messagePermission, weightUnit, distanceUnit, twoFactorEnabled, userProfile]);

  // Update analytics whenever settings change
  useEffect(() => {
    setInsights(generateSettingsInsights(fullSettings));
    setPrivacyLevel(calculatePrivacyLevel(fullSettings));
  }, [fullSettings]);

  const openModal = useCallback((id: string) => {
    const now = Date.now();
    if (now - lastModalAction < MODAL_DEBOUNCE_MS) return;
    setLastModalAction(now);
    setActiveModal(id);
  }, [lastModalAction]);

  const closeModal = useCallback((id: string) => {
    const now = Date.now();
    if (now - lastModalAction < MODAL_DEBOUNCE_MS) return;
    setLastModalAction(now);
    if (activeModal === id) setActiveModal(null);
  }, [activeModal, lastModalAction]);

  const isModalVisible = useCallback((id: string) => activeModal === id, [activeModal]);

  const saveField = useCallback(async (data: Record<string, unknown>) => {
    if (!currentUser) return;
    setSaving(true);
    try {
      await SettingsRepository.updateUser(currentUser.uid, data);
      Object.keys(data).forEach(key =>
        SettingsRepository.trackSettingsChange(currentUser.uid, key)
      );
      await refreshUserProfile();
    } catch (error) {
      console.error('Failed to save setting:', error);
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [currentUser, refreshUserProfile]);

  // Applies a full settings object to local state and Firestore — used by import/restore/reset
  const applySettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    const updates: Record<string, unknown> = {};
    if (newSettings.profileVisibility !== undefined) {
      setProfileVisibility(newSettings.profileVisibility as 'public' | 'private');
      updates.profileVisibility = newSettings.profileVisibility;
    }
    if (newSettings.messagePermission !== undefined) {
      setMessagePermission(newSettings.messagePermission as 'everyone' | 'followers');
      updates.messagePermission = newSettings.messagePermission;
    }
    if (newSettings.twoFactorEnabled !== undefined) {
      setTwoFactorEnabled(newSettings.twoFactorEnabled);
      updates.twoFactorEnabled = newSettings.twoFactorEnabled;
    }
    if (newSettings.units?.weight !== undefined) {
      setWeightUnit(newSettings.units.weight as 'metric' | 'imperial');
      updates['units.weight'] = newSettings.units.weight;
    }
    if (newSettings.units?.distance !== undefined) {
      setDistanceUnit(newSettings.units.distance as 'metric' | 'imperial');
      updates['units.distance'] = newSettings.units.distance;
    }
    if (Object.keys(updates).length > 0) {
      await saveField(updates);
    }
  }, [saveField]);

  const {
    handleLogout,
    handleDeleteAccount,
    clearChatHistory,
    clearSearchHistory,
    handleChangePassword,
    handleExportSettings,
    handleImportSettings,
    handleRestoreBackup,
    handleResetToDefaults,
  } = useSettingsHandlers({
    profileImage: undefined,
    originalProfileImage: undefined,
    settings: fullSettings,
    userProfile,
    currentUser,
    hasUnsavedChanges: false,
    setProfileImage: () => {},
    setImageManuallyChanged: () => {},
    setHasUnsavedChanges: () => {},
    setLoading: setSaving,
    setIsSaving: setSaving,
    setSettings: (newSettings) => {
      const resolved = typeof newSettings === 'function'
        ? newSettings(fullSettings)
        : newSettings;
      applySettings(resolved);
    },
    setOriginalSettings: () => {},
    setOriginalProfileImage: () => {},
    refreshUserProfile,
  });

  const handleToggle2FA = async (value: boolean) => {
    setTwoFactorEnabled(value);
    await saveField({ twoFactorEnabled: value });
  };

  const handleVisibilityChange = async (value: string) => {
    setProfileVisibility(value as 'public' | 'private');
    closeModal('privacy');
    await saveField({ profileVisibility: value });
  };

  const handleMessagePermissionChange = async (value: string) => {
    setMessagePermission(value as 'everyone' | 'followers');
    closeModal('message');
    await saveField({ messagePermission: value });
  };

  const handleWeightUnitChange = async (value: string) => {
    setWeightUnit(value as 'metric' | 'imperial');
    closeModal('weightUnit');
    await saveField({ 'units.weight': value });
  };

  const handleDistanceUnitChange = async (value: string) => {
    setDistanceUnit(value as 'metric' | 'imperial');
    closeModal('distanceUnit');
    await saveField({ 'units.distance': value });
  };

  const modalSettings = { profileVisibility, messagePermission, units: { weight: weightUnit, distance: distanceUnit } };
  const updateSetting = (key: string, value: any) => {
    if (key === 'profileVisibility') handleVisibilityChange(value);
    else if (key === 'messagePermission') handleMessagePermissionChange(value);
    else if (key === 'units.weight') handleWeightUnitChange(value);
    else if (key === 'units.distance') handleDistanceUnitChange(value);
  };

  const profileImageUrl = getOptimalImageUrl(userProfile?.profileThumbnailUrl, userProfile?.profileImageUrl) || userProfile?.profileImageUrl;

  return (
    <>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.placeholder}>
            {saving && <ActivityIndicator size="small" color="#FF2D55" />}
          </View>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* User Card */}
          <View style={styles.userCard}>
            {profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={styles.userAvatar} />
            ) : (
              <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                <Ionicons name="person" size={28} color="#3A3A3C" />
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userProfile?.displayName || 'User'}</Text>
              <Text style={styles.userHandle}>@{userProfile?.username || ''}</Text>
            </View>
          </View>

          {/* ACCOUNT */}
          <Text style={styles.sectionHeader}>ACCOUNT</Text>
          <View style={styles.card}>
            <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={handleChangePassword} activeOpacity={0.7}>
              <View style={styles.rowIconWrap}>
                <Ionicons name="key-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.rowLabel}>Change Password</Text>
              <Ionicons name="chevron-forward" size={16} color="#3A3A3C" style={styles.chevron} />
            </TouchableOpacity>

            <View style={[styles.row, styles.rowBorder]}>
              <View style={styles.rowIconWrap}>
                <Ionicons name="lock-closed-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.rowLabel}>Two-Factor Authentication</Text>
              <Switch
                value={twoFactorEnabled}
                onValueChange={handleToggle2FA}
                trackColor={{ false: '#3A3A3C', true: '#FF2D55' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#3A3A3C"
                style={{ alignSelf: 'center' }}
              />
            </View>

            <TouchableOpacity style={styles.row} onPress={handleDeleteAccount} activeOpacity={0.7}>
              <View style={styles.rowIconWrap}>
                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
              </View>
              <Text style={[styles.rowLabel, styles.destructiveText]}>Delete Account</Text>
            </TouchableOpacity>
          </View>

          {/* PRIVACY */}
          <Text style={styles.sectionHeader}>PRIVACY</Text>
          <View style={styles.card}>
            <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={() => openModal('privacy')} activeOpacity={0.7}>
              <View style={styles.rowIconWrap}>
                <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.rowLabel}>Profile Visibility</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{visibilityLabel[profileVisibility]}</Text>
                <Ionicons name="chevron-forward" size={16} color="#3A3A3C" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={() => openModal('message')} activeOpacity={0.7}>
              <View style={styles.rowIconWrap}>
                <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.rowLabel}>Who Can Message You</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{messageLabel[messagePermission]}</Text>
                <Ionicons name="chevron-forward" size={16} color="#3A3A3C" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={() => router.push('/blocked-users')} activeOpacity={0.7}>
              <View style={styles.rowIconWrap}>
                <Ionicons name="ban-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.rowLabel}>Blocked Users</Text>
              <Ionicons name="chevron-forward" size={16} color="#3A3A3C" style={styles.chevron} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.row} onPress={() => router.push('/mention-blocked-users')} activeOpacity={0.7}>
              <View style={styles.rowIconWrap}>
                <Ionicons name="at-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.rowLabel}>Blocked Mentions</Text>
              <Ionicons name="chevron-forward" size={16} color="#3A3A3C" style={styles.chevron} />
            </TouchableOpacity>
          </View>

          {/* NOTIFICATIONS */}
          <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={() => router.push('/settings-notifications')} activeOpacity={0.7}>
              <View style={styles.rowIconWrap}>
                <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.rowLabel}>Notifications</Text>
              <Ionicons name="chevron-forward" size={16} color="#3A3A3C" style={styles.chevron} />
            </TouchableOpacity>
          </View>

          {/* PREFERENCES */}
          <Text style={styles.sectionHeader}>PREFERENCES</Text>
          <View style={styles.card}>
            <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={() => openModal('weightUnit')} activeOpacity={0.7}>
              <View style={styles.rowIconWrap}>
                <Ionicons name="barbell-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.rowLabel}>Weight Unit</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{weightLabel[weightUnit]}</Text>
                <Ionicons name="chevron-forward" size={16} color="#3A3A3C" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.row} onPress={() => openModal('distanceUnit')} activeOpacity={0.7}>
              <View style={styles.rowIconWrap}>
                <Ionicons name="navigate-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.rowLabel}>Distance Unit</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{distanceLabel[distanceUnit]}</Text>
                <Ionicons name="chevron-forward" size={16} color="#3A3A3C" />
              </View>
            </TouchableOpacity>
          </View>

          {/* SUPPORT */}
          <Text style={styles.sectionHeader}>SUPPORT</Text>
          <View style={styles.card}>
            <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={() => router.push('/privacy-policy')} activeOpacity={0.7}>
              <View style={styles.rowIconWrap}>
                <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.rowLabel}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={16} color="#3A3A3C" style={styles.chevron} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={() => router.push('/terms-of-service')} activeOpacity={0.7}>
              <View style={styles.rowIconWrap}>
                <Ionicons name="reader-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.rowLabel}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={16} color="#3A3A3C" style={styles.chevron} />
            </TouchableOpacity>

            <View style={styles.row}>
              <View style={styles.rowIconWrap}>
                <Ionicons name="information-circle-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.rowLabel}>App Version</Text>
              <Text style={styles.rowValue}>{getFullVersionString()}</Text>
            </View>
          </View>

          {/* DATA */}
          <Text style={styles.sectionHeader}>DATA</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => Alert.alert(
                'Clear Chat History',
                'This will permanently delete all your chat messages. This action cannot be undone.',
                [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: clearChatHistory }]
              )}
              activeOpacity={0.7}
            >
              <View style={styles.rowIconWrap}>
                <Ionicons name="chatbubbles-outline" size={18} color="#FF3B30" />
              </View>
              <Text style={[styles.rowLabel, styles.destructiveText]}>Clear Chat History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.row}
              onPress={() => Alert.alert(
                'Clear Search History',
                'This will remove all your recent searches.',
                [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: clearSearchHistory }]
              )}
              activeOpacity={0.7}
            >
              <View style={styles.rowIconWrap}>
                <Ionicons name="search-outline" size={18} color="#FF3B30" />
              </View>
              <Text style={[styles.rowLabel, styles.destructiveText]}>Clear Search History</Text>
            </TouchableOpacity>
          </View>

          {/* ADVANCED */}
          <Text style={styles.sectionHeader}>ADVANCED</Text>
          <View style={styles.card}>
            <View style={[styles.row, styles.rowBorder]}>
              <View style={styles.rowIconWrap}>
                <Ionicons name="shield-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.rowLabel}>Privacy Level</Text>
              <View style={[
                styles.privacyLevelBadge,
                { backgroundColor: privacyLevel === 'strict' ? '#34C759' : privacyLevel === 'moderate' ? '#FF9500' : '#FF3B30' },
              ]}>
                <Text style={styles.privacyLevelText}>
                  {privacyLevel.charAt(0).toUpperCase() + privacyLevel.slice(1)}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={() => openModal('insights')} activeOpacity={0.7}>
              <View style={styles.rowIconWrap}>
                <Ionicons name="bulb-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.rowLabel}>Privacy Insights</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{insights.length}</Text>
                <Ionicons name="chevron-forward" size={16} color="#3A3A3C" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={handleExportSettings} activeOpacity={0.7}>
              <View style={styles.rowIconWrap}>
                <Ionicons name="share-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.rowLabel}>Export Settings</Text>
              <Ionicons name="chevron-forward" size={16} color="#3A3A3C" style={styles.chevron} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={handleImportSettings} activeOpacity={0.7}>
              <View style={styles.rowIconWrap}>
                <Ionicons name="download-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.rowLabel}>Import Settings</Text>
              <Ionicons name="chevron-forward" size={16} color="#3A3A3C" style={styles.chevron} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={handleRestoreBackup} activeOpacity={0.7}>
              <View style={styles.rowIconWrap}>
                <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.rowLabel}>Restore from Backup</Text>
              <Ionicons name="chevron-forward" size={16} color="#3A3A3C" style={styles.chevron} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.row} onPress={handleResetToDefaults} activeOpacity={0.7}>
              <View style={styles.rowIconWrap}>
                <Ionicons name="refresh-circle-outline" size={18} color="#FF3B30" />
              </View>
              <Text style={[styles.rowLabel, styles.destructiveText]}>Reset to Defaults</Text>
            </TouchableOpacity>
          </View>

          {/* Log Out */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <View style={styles.footer} />
        </ScrollView>
      </View>

      <SettingsModals
        archetypeData={archetypeData}
        privacyOptions={privacyOptions}
        permissionOptions={permissionOptions}
        themeOptions={themeOptions}
        languageOptions={languageOptions}
        isModalVisible={isModalVisible}
        openModal={openModal}
        closeModal={closeModal}
        settings={modalSettings}
        updateSetting={updateSetting}
        insights={insights}
        privacyLevel={privacyLevel}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scroll: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  placeholder: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2C2C2E',
  },
  userAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    marginLeft: 14,
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  userHandle: {
    color: '#8E8E93',
    fontSize: 14,
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
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  rowIconWrap: {
    width: 28,
    alignItems: 'center',
    marginRight: 12,
  },
  rowLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    color: '#8E8E93',
    fontSize: 15,
  },
  chevron: {
    marginLeft: 4,
  },
  destructiveText: {
    color: '#FF3B30',
  },
  privacyLevelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  privacyLevelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 32,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    height: 48,
  },
});
