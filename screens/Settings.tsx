import React, { useState, useCallback, useEffect } from 'react';
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

  // Settings state — only non-profile fields
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'private'>('public');
  const [messagePermission, setMessagePermission] = useState<'everyone' | 'followers'>('everyone');
  const [weightUnit, setWeightUnit] = useState<'metric' | 'imperial'>('metric');
  const [distanceUnit, setDistanceUnit] = useState<'metric' | 'imperial'>('metric');

  const [saving, setSaving] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [lastModalAction, setLastModalAction] = useState(0);
  const MODAL_DEBOUNCE_MS = 300;

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
      await refreshUserProfile();
    } catch (error) {
      console.error('Failed to save setting:', error);
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [currentUser, refreshUserProfile]);

  // Dummy state for useSettingsHandlers (only used for its action handlers)
  const [_dummySettings] = useState<Partial<UserSettings>>({});
  const [_dummyLoading, setDummyLoading] = useState(false);
  const [_dummyIsSaving, setDummyIsSaving] = useState(false);

  const { handleLogout, handleDeleteAccount, clearChatHistory, clearSearchHistory, handleChangePassword } =
    useSettingsHandlers({
      profileImage: undefined,
      originalProfileImage: undefined,
      settings: _dummySettings,
      userProfile,
      currentUser,
      hasUnsavedChanges: false,
      setProfileImage: () => {},
      setImageManuallyChanged: () => {},
      setHasUnsavedChanges: () => {},
      setLoading: setDummyLoading,
      setIsSaving: setDummyIsSaving,
      setSettings: () => {},
      setOriginalSettings: () => {},
      setOriginalProfileImage: () => {},
      refreshUserProfile,
    });

  // --- Settings update handlers ---
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

  // Adapters for SettingsModals (which expects updateSetting)
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
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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

        {/* Account Section */}
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
            />
          </View>

          <TouchableOpacity style={styles.row} onPress={handleDeleteAccount} activeOpacity={0.7}>
            <View style={styles.rowIconWrap}>
              <Ionicons name="trash-outline" size={18} color="#FF3B30" />
            </View>
            <Text style={[styles.rowLabel, styles.destructiveText]}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Section */}
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

          <TouchableOpacity style={styles.row} onPress={() => router.push('/blocked-users')} activeOpacity={0.7}>
            <View style={styles.rowIconWrap}>
              <Ionicons name="ban-outline" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.rowLabel}>Blocked Users</Text>
            <Ionicons name="chevron-forward" size={16} color="#3A3A3C" style={styles.chevron} />
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
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

        {/* Preferences Section */}
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

        {/* Support Section */}
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

        {/* Data Section */}
        <Text style={styles.sectionHeader}>DATA</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.row, styles.rowBorder]}
            onPress={() => Alert.alert('Clear Chat History', 'This will permanently delete all your chat messages. This action cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: clearChatHistory }])}
            activeOpacity={0.7}
          >
            <View style={styles.rowIconWrap}>
              <Ionicons name="chatbubbles-outline" size={18} color="#FF3B30" />
            </View>
            <Text style={[styles.rowLabel, styles.destructiveText]}>Clear Chat History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => Alert.alert('Clear Search History', 'This will remove all your recent searches.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: clearSearchHistory }])}
            activeOpacity={0.7}
          >
            <View style={styles.rowIconWrap}>
              <Ionicons name="search-outline" size={18} color="#FF3B30" />
            </View>
            <Text style={[styles.rowLabel, styles.destructiveText]}>Clear Search History</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.footer} />
      </ScrollView>

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
        insights={[]}
        privacyLevel="moderate"
      />
    </>
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
