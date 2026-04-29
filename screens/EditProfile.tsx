import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '@/context/AuthContext';
import { UserSettings } from '@/types/settings';
import { useSettingsHandlers } from '@/hooks/useSettingsHandlers';
import { SettingsModals } from '@/components/settings/SettingsModals';
import { SelectorItem } from '@/components/CustomSelector';
import { getOptimalImageUrl } from '@/utils/imageUtils';

const SOCIAL_PLATFORM_DISPLAY: Record<string, { icon: string; color: string; bg: string }> = {
  instagram: { icon: 'logo-instagram', color: '#E1306C', bg: 'rgba(225,48,108,0.18)' },
  facebook:  { icon: 'logo-facebook',  color: '#1877F2', bg: 'rgba(24,119,242,0.18)' },
  twitter:   { icon: 'logo-twitter',   color: '#1DA1F2', bg: 'rgba(29,161,242,0.18)' },
  tiktok:    { icon: 'logo-tiktok',    color: '#FE2C55', bg: 'rgba(254,44,85,0.18)' },
  youtube:   { icon: 'logo-youtube',   color: '#FF0000', bg: 'rgba(255,0,0,0.18)' },
  linkedin:  { icon: 'logo-linkedin',  color: '#0A66C2', bg: 'rgba(10,102,194,0.18)' },
  spotify:   { icon: 'musical-notes',  color: '#1DB954', bg: 'rgba(29,185,84,0.18)' },
  snapchat:  { icon: 'logo-snapchat',  color: '#FFFC00', bg: 'rgba(255,252,0,0.18)' },
  twitch:    { icon: 'logo-twitch',    color: '#9146FF', bg: 'rgba(145,70,255,0.18)' },
  github:    { icon: 'logo-github',    color: '#E6EDF3', bg: 'rgba(230,237,243,0.12)' },
};

const archetypeData: SelectorItem[] = [
  { label: 'Athlete', value: 'athlete', image: require('@/assets/images/athlete.png'), description: 'Focused on athletic performance' },
  { label: 'Bodybuilder', value: 'bodybuilder', image: require('@/assets/images/bodybuilder.png'), description: 'Building muscle mass and definition' },
  { label: 'Crossfitter', value: 'crossfitter', image: require('@/assets/images/crossfitter.png'), description: 'Functional fitness and varied workouts' },
  { label: 'Generalist', value: 'generalist', image: require('@/assets/images/generalist.png'), description: 'Well-rounded fitness approach' },
  { label: 'Powerlifter', value: 'powerlifter', image: require('@/assets/images/powerlifter.png'), description: 'Maximum strength in core lifts' },
];

const archetypeLabels: Record<string, string> = {
  athlete: 'Athlete',
  bodybuilder: 'Bodybuilder',
  crossfitter: 'Crossfitter',
  generalist: 'Generalist',
  powerlifter: 'Powerlifter',
};

const privacyOptions = [
  { label: 'Public', value: 'public', icon: 'earth', description: 'Anyone can see your profile' },
  { label: 'Private', value: 'private', icon: 'lock-closed', description: 'Only your followers can see your profile' },
];
const permissionOptions = [{ label: 'Everyone', value: 'everyone', icon: 'globe' }, { label: 'Followers Only', value: 'followers', icon: 'people' }];
const themeOptions = [{ label: 'Light', value: 'light', icon: 'sunny' }, { label: 'Dark', value: 'dark', icon: 'moon' }, { label: 'System', value: 'system', icon: 'phone-portrait' }];
const languageOptions = [{ label: 'English', value: 'en', icon: 'flag' }];

export default function EditProfile() {
  const { userProfile, currentUser, refreshUserProfile } = useAuth();
  const router = useRouter();

  const [settings, setSettings] = useState<Partial<UserSettings>>({
    displayName: '',
    bio: '',
    archetype: '',
    dateOfBirth: undefined,
    socialLinks: {
      instagram: '', facebook: '', twitter: '', tiktok: '',
      youtube: '', linkedin: '', spotify: '', snapchat: '',
      twitch: '', github: '', customUrl: '', customLabel: '',
      showLinksToFollowersOnly: false,
    },
  });

  const [profileImage, setProfileImage] = useState<string | undefined>(undefined);
  const [originalProfileImage, setOriginalProfileImage] = useState<string | undefined>(undefined);
  const [originalSettings, setOriginalSettings] = useState<Partial<UserSettings>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageManuallyChanged, setImageManuallyChanged] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const dateModalProgress = useSharedValue(0);

  useEffect(() => {
    if (dateModalVisible) {
      dateModalProgress.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    } else {
      dateModalProgress.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) });
    }
  }, [dateModalVisible]);

  const dateOverlayAnimStyle = useAnimatedStyle(() => ({
    opacity: dateModalProgress.value,
  }));

  const dateSheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - dateModalProgress.value) * 360 }],
  }));

  const MODAL_DEBOUNCE_MS = 300;
  const [lastModalAction, setLastModalAction] = useState(0);

  const openModal = useCallback((modalId: string) => {
    const now = Date.now();
    if (now - lastModalAction < MODAL_DEBOUNCE_MS) return;
    setLastModalAction(now);
    setActiveModal(modalId);
  }, [lastModalAction]);

  const closeModal = useCallback((modalId: string) => {
    const now = Date.now();
    if (now - lastModalAction < MODAL_DEBOUNCE_MS) return;
    setLastModalAction(now);
    if (activeModal === modalId) setActiveModal(null);
  }, [activeModal, lastModalAction]);

  const isModalVisible = useCallback((modalId: string) => activeModal === modalId, [activeModal]);

  // Load profile data
  useEffect(() => {
    if (userProfile && !isSaving) {
      const parseDateOfBirth = (dateValue: any): Date | undefined => {
        if (!dateValue) return undefined;
        try {
          if (dateValue instanceof Date) return isNaN(dateValue.getTime()) ? undefined : dateValue;
          if (dateValue.toDate && typeof dateValue.toDate === 'function') return dateValue.toDate();
          if (typeof dateValue === 'string') {
            const parsed = new Date(dateValue);
            return isNaN(parsed.getTime()) ? undefined : parsed;
          }
        } catch {}
        return undefined;
      };

      setSettings({
        displayName: userProfile.displayName || '',
        bio: userProfile.bio || '',
        archetype: userProfile.archetype || '',
        dateOfBirth: parseDateOfBirth(userProfile.dateOfBirth),
        socialLinks: {
          instagram: userProfile.socialLinks?.instagram || '',
          facebook: userProfile.socialLinks?.facebook || '',
          twitter: userProfile.socialLinks?.twitter || '',
          tiktok: userProfile.socialLinks?.tiktok || '',
          youtube: userProfile.socialLinks?.youtube || '',
          linkedin: userProfile.socialLinks?.linkedin || '',
          spotify: userProfile.socialLinks?.spotify || '',
          snapchat: userProfile.socialLinks?.snapchat || '',
          twitch: userProfile.socialLinks?.twitch || '',
          github: userProfile.socialLinks?.github || '',
          customUrl: userProfile.socialLinks?.customUrl || '',
          customLabel: userProfile.socialLinks?.customLabel || '',
          showLinksToFollowersOnly: userProfile.socialLinks?.showLinksToFollowersOnly || false,
        },
      });

      if (!imageManuallyChanged) {
        setProfileImage(userProfile.profileImageUrl);
        setOriginalProfileImage(userProfile.profileImageUrl);
      }
    }
  }, [userProfile, isSaving, imageManuallyChanged]);

  // Track originalSettings once on mount
  useEffect(() => {
    if (userProfile && Object.keys(originalSettings).length === 0) {
      setOriginalSettings({
        displayName: userProfile.displayName || '',
        bio: userProfile.bio || '',
        archetype: userProfile.archetype || '',
        socialLinks: { ...userProfile.socialLinks },
      });
    }
  }, [userProfile]);

  // Track unsaved changes
  useEffect(() => {
    const changed =
      settings.displayName !== (userProfile?.displayName || '') ||
      settings.bio !== (userProfile?.bio || '') ||
      settings.archetype !== (userProfile?.archetype || '') ||
      profileImage !== originalProfileImage;
    setHasUnsavedChanges(changed);
  }, [settings, profileImage, originalProfileImage, userProfile]);

  const { handleBackPress, pickImage, handleSaveSettings } = useSettingsHandlers({
    profileImage,
    originalProfileImage,
    settings,
    userProfile,
    currentUser,
    hasUnsavedChanges,
    setProfileImage,
    setImageManuallyChanged,
    setHasUnsavedChanges,
    setLoading,
    setIsSaving,
    setSettings,
    setOriginalSettings,
    setOriginalProfileImage,
    refreshUserProfile,
  });

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => {
      if (key.includes('.')) {
        const keys = key.split('.');
        if (keys[0] === 'socialLinks') {
          return { ...prev, socialLinks: { ...prev.socialLinks, [keys[1]]: value } };
        }
        return { ...prev, [keys[0]]: { ...(prev as any)[keys[0]], [keys[1]]: value } };
      }
      return { ...prev, [key]: value };
    });
  };

  const filledPlatforms = Object.entries(SOCIAL_PLATFORM_DISPLAY).filter(
    ([key]) => !!(settings.socialLinks as any)?.[key]
  );
  const filledLinkCount = Object.entries(settings.socialLinks || {}).filter(
    ([key, value]) => key !== 'showLinksToFollowersOnly' && key !== 'customLabel' && !!value
  ).length;
  const previewIcons = filledPlatforms.slice(0, 4);
  const extraCount = filledLinkCount - previewIcons.length;

  const formatDateOfBirth = (dob: any): string => {
    if (!dob) return 'Not set';
    let d = dob;
    if (typeof d === 'string') d = new Date(d);
    if (d && typeof d.toDate === 'function') d = d.toDate();
    if (d instanceof Date && !isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return 'Not set';
  };

  const placeholderImage = 'https://thumbs.dreamstime.com/b/creative-illustration-default-avatar-profile-placeholder-isolated-background-art-design-grey-photo-blank-template-mockup-144855718.jpg';

  return (
    <>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBackPress} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
          <TouchableOpacity
            style={[styles.saveButton, (!hasUnsavedChanges && !loading) && styles.saveButtonDim]}
            onPress={handleSaveSettings}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FF2D55" />
            ) : (
              <Text style={[styles.saveButtonText, (!hasUnsavedChanges && !loading) && styles.saveButtonTextDim]}>
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Profile Photo */}
        <View style={styles.photoSection}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={styles.photoWrapper}>
            <Image
              source={{ uri: profileImage || getOptimalImageUrl(userProfile?.profileThumbnailUrl, userProfile?.profileImageUrl) || placeholderImage }}
              style={styles.profileImage}
              key={profileImage || 'default'}
            />
            <View style={styles.photoOverlay}>
              <Ionicons name="camera" size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </View>

        {/* Profile Section */}
        <Text style={styles.sectionHeader}>PROFILE</Text>
        <View style={styles.card}>
          <View style={[styles.inputRow, styles.rowBorder]}>
            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              style={styles.textInput}
              value={settings.displayName || ''}
              onChangeText={(v) => updateSetting('displayName', v)}
              placeholder="Enter display name"
              placeholderTextColor="#3A3A3C"
              maxLength={30}
              returnKeyType="done"
            />
          </View>
          <View style={[styles.inputRow, styles.rowBorder]}>
            <Text style={styles.inputLabel}>Username</Text>
            <Text style={styles.infoValue}>@{userProfile?.username || ''}</Text>
          </View>
          <View style={styles.bioRow}>
            <Text style={[styles.inputLabel, styles.bioLabel]}>Bio</Text>
            <TextInput
              style={styles.bioInput}
              value={settings.bio || ''}
              onChangeText={(v) => updateSetting('bio', v)}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#3A3A3C"
              multiline
              maxLength={300}
              returnKeyType="done"
            />
            <Text style={styles.charCount}>{(settings.bio || '').length}/300</Text>
          </View>
        </View>

        {/* Fitness Section */}
        <Text style={styles.sectionHeader}>FITNESS</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.selectRow, styles.rowBorder]}
            onPress={() => openModal('archetype')}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>Archetype</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>
                {archetypeLabels[settings.archetype?.toLowerCase() || ''] || 'Not set'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#3A3A3C" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.selectRow}
            onPress={() => setDateModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>Date of Birth</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{formatDateOfBirth(settings.dateOfBirth)}</Text>
              <Ionicons name="chevron-forward" size={16} color="#3A3A3C" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Social + Profile Card */}
        <Text style={styles.sectionHeader}>SOCIAL</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.selectRow, styles.rowBorder]}
            onPress={() => router.push('/edit-profile-social-links')}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>Social Links</Text>
            <View style={styles.rowRight}>
              {previewIcons.length > 0 ? (
                <View style={styles.socialIconRow}>
                  {previewIcons.map(([key, cfg]) => (
                    <View key={key} style={[styles.socialIconBadge, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
                    </View>
                  ))}
                  {extraCount > 0 && (
                    <Text style={styles.rowValue}>+{extraCount}</Text>
                  )}
                </View>
              ) : (
                <Text style={styles.rowValue}>Add links</Text>
              )}
              <Ionicons name="chevron-forward" size={16} color="#3A3A3C" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.selectRow}
            onPress={() => router.push(`/view-profile-card/${currentUser?.uid}`)}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>View Profile Card</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>Preview</Text>
              <Ionicons name="chevron-forward" size={16} color="#3A3A3C" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer} />
        </ScrollView>
      </View>

      {/* Date Picker Modal */}
      <Animated.View
        style={[styles.modalOverlay, dateOverlayAnimStyle]}
        pointerEvents={dateModalVisible ? 'auto' : 'none'}
      >
        <Animated.View style={[styles.dateModal, dateSheetAnimStyle]}>
            <View style={styles.dateModalHeader}>
              <Text style={styles.dateModalTitle}>Date of Birth</Text>
              <TouchableOpacity onPress={() => setDateModalVisible(false)}>
                <Ionicons name="close" size={22} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            {dateModalVisible && (
              <DateTimePicker
                value={settings.dateOfBirth instanceof Date && !isNaN(settings.dateOfBirth.getTime()) ? settings.dateOfBirth : new Date(2000, 0, 1)}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate && event.type !== 'dismissed') {
                    const now = new Date();
                    if (selectedDate > now) {
                      Alert.alert('Invalid Date', 'Date of birth cannot be in the future');
                      return;
                    }
                    updateSetting('dateOfBirth', selectedDate);
                  }
                }}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                style={{ backgroundColor: '#1C1C1E' }}
              />
            )}
            <TouchableOpacity style={styles.dateModalDone} onPress={() => setDateModalVisible(false)}>
              <Text style={styles.dateModalDoneText}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

      <SettingsModals
        archetypeData={archetypeData}
        privacyOptions={privacyOptions}
        permissionOptions={permissionOptions}
        themeOptions={themeOptions}
        languageOptions={languageOptions}
        isModalVisible={isModalVisible}
        openModal={openModal}
        closeModal={closeModal}
        settings={settings}
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
  saveButtonTextDim: {
    color: '#FF2D55',
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  photoWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  profileImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#1C1C1E',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF2D55',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  changePhotoText: {
    color: '#FF2D55',
    fontSize: 15,
    fontWeight: '500',
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
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 56,
    paddingVertical: 8,
  },
  inputLabel: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
    width: 120,
    flexShrink: 0,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'right',
    paddingVertical: 0,
  },
  infoValue: {
    flex: 1,
    color: '#8E8E93',
    fontSize: 16,
    textAlign: 'right',
  },
  bioRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  bioLabel: {
    marginBottom: 6,
    width: undefined,
  },
  bioInput: {
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 72,
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  charCount: {
    color: '#48484A',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  rowLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    marginRight: 10,
  },
  socialIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  socialIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    color: '#8E8E93',
    fontSize: 16,
  },
  footer: {
    height: 40,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  dateModal: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
  },
  dateModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  dateModalTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  dateModalDone: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#FF2D55',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateModalDoneText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
