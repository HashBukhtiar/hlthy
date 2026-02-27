import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Keyboard, Alert, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { UserSettings, SettingsSection as SettingsSectionType } from '@/types/settings';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getFullVersionString } from '@/utils/appVersion';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingsItem } from '@/components/settings/SettingsItem';
import { validatePlatformUrl, validateCustomUrl, usernameToUrl, VERIFIED_PLATFORMS, type PlatformKey } from '@/utils/socialLinkValidation';
import { generateSettingsInsights, calculatePrivacyLevel, trackSettingsChange } from '@/utils/settingsAnalytics';
import { useSettingsHandlers } from '@/hooks/useSettingsHandlers';
import { SettingsModals } from '@/components/settings/SettingsModals';
import { SelectorItem } from '@/components/CustomSelector';
import { getOptimalImageUrl } from '@/utils/imageUtils';

// todo: probs should move this stuff to the cloud
const archetypeData: SelectorItem[] = [
  { 
    label: 'Athlete', 
    value: 'athlete', 
    image: require('@/assets/images/athlete.png'),
    description: 'Focused on athletic performance'
  },
  { 
    label: 'Bodybuilder', 
    value: 'bodybuilder', 
    image: require('@/assets/images/bodybuilder.png'),
    description: 'Building muscle mass and definition'
  },
  { 
    label: 'Crossfitter', 
    value: 'crossfitter', 
    image: require('@/assets/images/crossfitter.png'),
    description: 'Functional fitness and varied workouts'
  },
  { 
    label: 'Generalist', 
    value: 'generalist', 
    image: require('@/assets/images/generalist.png'),
    description: 'Well-rounded fitness approach'
  },
  { 
    label: 'Powerlifter', 
    value: 'powerlifter', 
    image: require('@/assets/images/powerlifter.png'),
    description: 'Maximum strength in core lifts'
  },
];

const privacyOptions = [
  { label: 'Public', value: 'public', icon: 'earth', description: 'Anyone can see your profile' },
  { label: 'Private', value: 'private', icon: 'lock-closed', description: 'Only your followers can see your profile' },
];

const permissionOptions = [
  { label: 'Everyone', value: 'everyone', icon: 'globe' },
  { label: 'Followers Only', value: 'followers', icon: 'people' },
];

const followOptions = [
  { label: 'Anyone', value: 'anyone', icon: 'person-add' },
  { label: 'Approval Required', value: 'approval', icon: 'checkmark-circle' },
];

const themeOptions = [
  { label: 'Light', value: 'light', icon: 'sunny' },
  { label: 'Dark', value: 'dark', icon: 'moon' },
  { label: 'System', value: 'system', icon: 'phone-portrait' },
];

const languageOptions = [
  { label: 'English', value: 'en', icon: 'flag' },
  { label: 'Spanish', value: 'es', icon: 'flag-outline' },
  { label: 'French', value: 'fr', icon: 'library' },
  { label: 'German', value: 'de', icon: 'business' },
  { label: 'Italian', value: 'it', icon: 'wine' },
  { label: 'Dutch', value: 'nl', icon: 'flower' },
];

export default function Settings() {
  const { userProfile, currentUser, refreshUserProfile } = useAuth();
  const router = useRouter();
  
  // Settings state
  const [settings, setSettings] = useState<Partial<UserSettings>>({
    displayName: '',
    bio: '',
    archetype: '',
    profileVisibility: 'public',
    messagePermission: 'everyone',
    theme: 'dark',
    language: 'en',
    units: {
      weight: 'metric',
      distance: 'metric',
    },
    notifications: {
      newFollowers: true,
      likesAndComments: true,
      directMessages: true,
      followRequestAccepted: true,
      taggedInComments: true,
      mentionedInReplies: true,
    },
    twoFactorEnabled: false,
    dateOfBirth: undefined,
    socialLinks: {
      instagram: '',
      facebook: '',
      twitter: '',
      tiktok: '',
      youtube: '',
      linkedin: '',
      spotify: '',
      snapchat: '',
      twitch: '',
      github: '',
      customUrl: '',
      customLabel: '',
      showLinksToFollowersOnly: false,
    },
  });

  // UI state
  const [sections, setSections] = useState<SettingsSectionType[]>([
    { id: 'profile', title: 'Profile Information', icon: 'person-circle', expanded: true },
    { id: 'account', title: 'Account & Security', icon: 'shield-checkmark', expanded: false },
    { id: 'privacy', title: 'Privacy & Visibility', icon: 'eye', expanded: false },
    { id: 'notifications', title: 'Notifications', icon: 'notifications', expanded: false },
    { id: 'preferences', title: 'UI/UX Preferences', icon: 'settings', expanded: false },
    { id: 'misc', title: 'Miscellaneous', icon: 'ellipsis-horizontal', expanded: false },
    { id: 'advanced', title: 'Advanced', icon: 'cog', expanded: false }, // Add this line
  ]);

  const [profileImage, setProfileImage] = useState(() => {
    const initialImage = userProfile?.profileImageUrl;
    console.log('[Settings Init] Initial profileImage:', initialImage);
    return initialImage;
  });
  const [originalProfileImage, setOriginalProfileImage] = useState(() => {
    const initialOriginal = userProfile?.profileImageUrl;
    console.log('[Settings Init] Initial originalProfileImage:', initialOriginal);
    return initialOriginal;
  });
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  const [privacyLevel, setPrivacyLevel] = useState<'open' | 'moderate' | 'strict'>('moderate');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<Partial<UserSettings>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [imageManuallyChanged, setImageManuallyChanged] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalQueue, setModalQueue] = useState<string[]>([]);
  const [lastModalAction, setLastModalAction] = useState<number>(0);


  const MODAL_DEBOUNCE_MS = 300;

  // Track profileImage changes for debugging
  useEffect(() => {
    console.log('[Settings] profileImage state changed to:', profileImage);
    console.log('[Settings] imageManuallyChanged:', imageManuallyChanged);
  }, [profileImage, imageManuallyChanged]);

  // Track originalProfileImage changes for debugging
  useEffect(() => {
    console.log('[Settings] originalProfileImage state changed to:', originalProfileImage);
  }, [originalProfileImage]);

  // Update settings when userProfile changes
  useEffect(() => {
    if (userProfile && !isSaving) {
      const parseDateOfBirth = (dateValue: any) => {
        if (!dateValue) return undefined;
        
        try {
          if (dateValue instanceof Date) {
            return isNaN(dateValue.getTime()) ? undefined : dateValue;
          }
          
          // Handle Firestore Timestamp
          if (dateValue.toDate && typeof dateValue.toDate === 'function') {
            return dateValue.toDate();
          }
          
          // Handle string dates
          if (typeof dateValue === 'string') {
            const parsed = new Date(dateValue);
            return isNaN(parsed.getTime()) ? undefined : parsed;
          }
          
          return undefined;
        } catch (error) {
          console.error('Error parsing date of birth:', error);
          return undefined;
        }
      };

      setSettings(prev => ({
        ...prev,
        displayName: userProfile.displayName || '',
        bio: userProfile.bio || '',
        archetype: userProfile.archetype || '',
        profileVisibility: userProfile.profileVisibility || 'public',
        messagePermission: userProfile.messagePermission || 'everyone',
        theme: userProfile.theme || 'dark',
        language: userProfile.language || 'en',
        units: {
          weight: userProfile.units?.weight || 'metric',
          distance: userProfile.units?.distance || 'metric',
        },
        notifications: {
          newFollowers: userProfile.notifications?.newFollowers ?? true,
          likesAndComments: userProfile.notifications?.likesAndComments ?? true,
          directMessages: userProfile.notifications?.directMessages ?? true,
          followRequestAccepted: userProfile.notifications?.followRequestAccepted ?? true,
          taggedInComments: userProfile.notifications?.taggedInComments ?? true,
          mentionedInReplies: userProfile.notifications?.mentionedInReplies ?? true,
        },
        twoFactorEnabled: userProfile.twoFactorEnabled || false,
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
      }));
      
      // Debug logging for socialLinks loading
      console.log('[Settings] Loaded socialLinks from userProfile:', JSON.stringify(userProfile.socialLinks, null, 2));
      
      if (!imageManuallyChanged) {
        const imageUrl = userProfile.profileImageUrl;
        console.log('[Settings] === PROFILE IMAGE SYNC START ===');
        console.log('[Settings] Current profileImage state:', profileImage);
        console.log('[Settings] Current originalProfileImage state:', originalProfileImage);
        console.log('[Settings] userProfile.profileImageUrl:', imageUrl);
        console.log('[Settings] imageManuallyChanged:', imageManuallyChanged);
        console.log('[Settings] Updating profileImage from userProfile to:', imageUrl);
        setProfileImage(imageUrl);
        
        // Ensure originalProfileImage is kept in sync when not manually changed
        // This handles the case where user returns to settings after discarding
        setOriginalProfileImage(imageUrl);
        console.log('[Settings] Also updated originalProfileImage to:', imageUrl);
        console.log('[Settings] === PROFILE IMAGE SYNC END ===');
      } else {
        console.log('[Settings] Skipping profile image sync - imageManuallyChanged is true');
        console.log('[Settings] Current profileImage:', profileImage);
        console.log('[Settings] Current originalProfileImage:', originalProfileImage);
      }
    }
  }, [userProfile, isSaving, imageManuallyChanged]);

  useEffect(() => {
    if (userProfile && Object.keys(originalSettings).length === 0) {
      const parseDateOfBirth = (dateValue: any) => {
        if (!dateValue) return undefined;
        
        try {
          if (dateValue instanceof Date) {
            return isNaN(dateValue.getTime()) ? undefined : dateValue;
          }
          
          if (dateValue.toDate && typeof dateValue.toDate === 'function') {
            return dateValue.toDate();
          }
          
          if (typeof dateValue === 'string') {
            const parsed = new Date(dateValue);
            return isNaN(parsed.getTime()) ? undefined : parsed;
          }
          
          return undefined;
        } catch (error) {
          console.error('Error parsing date of birth:', error);
          return undefined;
        }
      };

      // Set originalSettings with the exact same structure as settings
      const originalSettingsData = {
        displayName: userProfile.displayName || '',
        bio: userProfile.bio || '',
        archetype: userProfile.archetype || '',
        profileVisibility: userProfile.profileVisibility || 'public',
        messagePermission: userProfile.messagePermission || 'everyone',
        theme: userProfile.theme || 'dark',
        language: userProfile.language || 'en',
        units: {
          weight: userProfile.units?.weight || 'metric',
          distance: userProfile.units?.distance || 'metric',
        },
        notifications: {
          newFollowers: userProfile.notifications?.newFollowers ?? true,
          likesAndComments: userProfile.notifications?.likesAndComments ?? true,
          directMessages: userProfile.notifications?.directMessages ?? true,
          followRequestAccepted: userProfile.notifications?.followRequestAccepted ?? true,
          taggedInComments: userProfile.notifications?.taggedInComments ?? true,
          mentionedInReplies: userProfile.notifications?.mentionedInReplies ?? true,
        },
        twoFactorEnabled: userProfile.twoFactorEnabled || false,
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
      };

      setOriginalSettings(originalSettingsData);
      setOriginalProfileImage(userProfile?.profileImageUrl);
    }
  }, [userProfile, originalSettings]);

  useEffect(() => {
    // Only check for changes if we have original settings
    if (Object.keys(originalSettings).length > 0) {
      // Generate insights when settings change
      const newInsights = generateSettingsInsights(settings);
      setInsights(newInsights);
      setPrivacyLevel(calculatePrivacyLevel(settings));
      
      // Deep comparison function to properly compare objects
      const deepEqual = (obj1: any, obj2: any): boolean => {
        if (obj1 === obj2) return true;
        
        if (obj1 == null || obj2 == null) return obj1 === obj2;
        
        if (typeof obj1 !== typeof obj2) return false;
        
        if (typeof obj1 !== 'object') return obj1 === obj2;
        
        // Handle Date objects
        if (obj1 instanceof Date && obj2 instanceof Date) {
          return obj1.getTime() === obj2.getTime();
        }
        
        if (obj1 instanceof Date || obj2 instanceof Date) {
          return false;
        }
        
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        
        if (keys1.length !== keys2.length) return false;
        
        for (let key of keys1) {
          if (!keys2.includes(key)) return false;
          if (!deepEqual(obj1[key], obj2[key])) return false;
        }
        
        return true;
      };
      
      // Check for unsaved changes using deep comparison
      const hasChanges = !deepEqual(settings, originalSettings);
      const profileImageChanged = profileImage !== userProfile?.profileImageUrl;
      
      setHasUnsavedChanges(hasChanges || profileImageChanged);
    }
  }, [settings, originalSettings, profileImage, userProfile?.profileImageUrl]);

  useEffect(() => {
    // Auto-save functionality
    if (!hasUnsavedChanges || !autoSaveEnabled || !isOnline || isSaving) {
      return;
    }

    const autoSaveTimer = setTimeout(async () => {
      try {
        await handleSaveSettings();
        setLastAutoSave(new Date());
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
        // Don't show alert for auto-save failures to avoid interrupting user
      }
    }, 5000); // Auto-save after 5 seconds of no changes

    return () => clearTimeout(autoSaveTimer);
  }, [hasUnsavedChanges, autoSaveEnabled, isOnline, isSaving, settings]);

  const openModal = useCallback((modalId: string) => {
    Keyboard.dismiss();
  
    const now = Date.now();
    if (now - lastModalAction < MODAL_DEBOUNCE_MS) {
      return;
    }
    
    // Close any currently active modal first
    if (activeModal && activeModal !== modalId) {
      closeModal(activeModal);
      
      // Queue the new modal to open after current one closes
      setModalQueue(prev => [...prev, modalId]);
      return;
    }
    
    setActiveModal(modalId);
    setLastModalAction(now);
  }, [activeModal, lastModalAction]);

  const closeModal = useCallback((modalId: string) => {
    const now = Date.now();
    if (now - lastModalAction < MODAL_DEBOUNCE_MS) {
      return;
    }
    
    if (activeModal === modalId) {
      setActiveModal(null);
      setLastModalAction(now);
      
      // Process modal queue if any
      if (modalQueue.length > 0) {
        const nextModal = modalQueue[0];
        setModalQueue(prev => prev.slice(1));
        setTimeout(() => openModal(nextModal), 100);
      }
    }
  }, [activeModal, lastModalAction, modalQueue, openModal]);

  // Enhanced modal visibility getters
  const isModalVisible = useCallback((modalId: string) => {
    return activeModal === modalId;
  }, [activeModal]);

  // Use settings handlers hook
  const {
    handleBackPress,
    pickImage,
    handleSaveSettings,
    handleExportSettings,
    handleImportSettings,
    handleRestoreBackup,
    handleResetToDefaults,
    handleLogout,
    handleDeleteAccount,
    clearChatHistory,
    clearSearchHistory,
    handleChangePassword,
  } = useSettingsHandlers({
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

  const toggleSection = (sectionId: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, expanded: !section.expanded }
        : section
    ));
  };

  const updateSetting = (key: string, value: any) => {
    const oldValue = key.includes('.') 
      ? (key.split('.').reduce((obj: any, k) => obj?.[k], settings) as any)
      : settings[key as keyof typeof settings];

    setSettings(prev => {
      if (key.includes('.')) {
        const keys = key.split('.');
        // Create a deep copy for nested updates
        const newSettings = { ...prev };
        
        // Handle socialLinks specifically to ensure proper deep copy
        if (keys[0] === 'socialLinks') {
          newSettings.socialLinks = {
            ...prev.socialLinks,
            [keys[1]]: value,
          };
          return newSettings;
        }
        
        // Handle other nested objects (notifications, units)
        if (keys[0] === 'notifications') {
          newSettings.notifications = {
            newFollowers: prev.notifications?.newFollowers ?? true,
            likesAndComments: prev.notifications?.likesAndComments ?? true,
            directMessages: prev.notifications?.directMessages ?? true,
            followRequestAccepted: prev.notifications?.followRequestAccepted ?? true,
            taggedInComments: prev.notifications?.taggedInComments ?? true,
            mentionedInReplies: prev.notifications?.mentionedInReplies ?? true,
            [keys[1]]: value,
          };
          return newSettings;
        }
        
        if (keys[0] === 'units') {
          newSettings.units = {
            weight: prev.units?.weight ?? 'metric',
            distance: prev.units?.distance ?? 'metric',
            [keys[1]]: value,
          };
          return newSettings;
        }
        
        // Fallback for other nested paths
        let current: any = newSettings;
        for (let i = 0; i < keys.length - 1; i++) {
          current[keys[i]] = { ...current[keys[i]] };
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return newSettings;
      } else {
        return { ...prev, [key]: value };
      }
    });

    // Track the change for analytics - make it safer
    if (currentUser) {
      trackSettingsChange(currentUser.uid, key, oldValue, value).catch(error => {
        console.log('Analytics tracking failed (non-critical):', error.message);
        // Don't show error to user - analytics failure is not critical
      });
    }
  };

  // Handler to convert username to URL when user finishes editing
  const handleSocialLinkBlur = (platform: PlatformKey) => {
    const currentValue = settings.socialLinks?.[platform] || '';
    if (!currentValue) return;
    
    // Convert username to full URL
    const formattedUrl = usernameToUrl(platform, currentValue);
    
    // Update the setting if the value changed
    if (formattedUrl !== currentValue) {
      updateSetting(`socialLinks.${platform}`, formattedUrl);
    }
  };

  // All handler functions have been moved to useSettingsHandlers hook above
  // This keeps the component clean and focused on rendering

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Settings</Text>
            <View style={styles.placeholder} />
          </View>
        </View>

        {/* Profile Information Section */}
        <SettingsSection
          title="Profile Information"
          icon="person-circle"
          expanded={sections.find(s => s.id === 'profile')?.expanded || false}
          onToggle={() => toggleSection('profile')}
        >
          <View style={styles.profileImageSection}>
            <Image 
              source={{ 
                uri: profileImage || 
                    getOptimalImageUrl(userProfile?.profileThumbnailUrl, userProfile?.profileImageUrl) || 
                    'https://thumbs.dreamstime.com/b/creative-illustration-default-avatar-profile-placeholder-isolated-background-art-design-grey-photo-blank-template-mockup-144855718.jpg',
                cache: 'reload'
              }} 
              style={styles.profileImage}
              key={profileImage || 'default'}
            />
            <TouchableOpacity style={styles.changePhotoButton} onPress={pickImage}>
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          <SettingsItem
            type="input"
            label="Display Name"
            value={settings.displayName}
            onValueChange={(value) => updateSetting('displayName', value)}
            placeholder="Enter display name"
            maxLength={30}
            helperText={`${settings.displayName?.length || 0}/30 characters`}
          />

          <SettingsItem
            type="input"
            label="Bio"
            value={settings.bio}
            onValueChange={(value) => updateSetting('bio', value)}
            placeholder="Tell us about yourself"
            maxLength={300}
            helperText={`${settings.bio?.length || 0}/300 characters`}
          />

          <SettingsItem
            type="select"
            label="Date of Birth"
            value={settings.dateOfBirth}
            onPress={() => {
              setDateModalVisible(true);
            }}
            placeholder="Select your birth date"
            helperText="Used for age-based recommendations"
            displayValue={
              settings.dateOfBirth
                ? (() => {
                    let dateObj = settings.dateOfBirth;
                    if (typeof dateObj === 'string') {
                      dateObj = new Date(dateObj);
                    }
                    if (
                      dateObj &&
                      typeof dateObj === 'object' &&
                      typeof (dateObj as any).toDate === 'function' &&
                      !(dateObj instanceof Date)
                    ) {
                      dateObj = (dateObj as any).toDate();
                    }
                    return dateObj instanceof Date && !isNaN(dateObj.getTime())
                      ? dateObj.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Select your birth date';
                  })()
                : 'Select your birth date'
            }
          />

          <SettingsItem
            type="select"
            label="Archetype"
            value={settings.archetype}
            onPress={() => openModal('archetype')}
            options={archetypeData.map(item => ({ label: item.label, value: item.value }))}
          />

          <SettingsItem
            type="info"
            label="Username"
            value={userProfile?.username}
            helperText="Username cannot be changed"
          />

          <SettingsItem
            type="info"
            label="Email"
            value={currentUser?.email}
          />

          <SettingsItem
            type="button"
            label="View Profile Card"
            onPress={() => router.push(`/view-profile-card/${currentUser?.uid}`)}
            helperText="Open your public profile card"
          />

          {/* Social Links Subsection */}
          <View style={{ marginTop: 20, marginBottom: 10 }}>
            <Text style={{ color: '#999', fontSize: 14, fontWeight: '600', paddingHorizontal: 15 }}>
              SOCIAL LINKS
            </Text>
          </View>

          {Object.entries(VERIFIED_PLATFORMS).map(([key, platform]) => (
            <SettingsItem
              key={key}
              type="input"
              label={platform.name}
              value={settings.socialLinks?.[key as PlatformKey] || ''}
              onValueChange={(value) => updateSetting(`socialLinks.${key}`, value)}
              onBlur={() => handleSocialLinkBlur(key as PlatformKey)}
              placeholder={platform.placeholder}
              helperText={
                settings.socialLinks?.[key as PlatformKey] && 
                !validatePlatformUrl(key as PlatformKey, settings.socialLinks[key as PlatformKey]!)
                  ? `Invalid ${platform.name} URL format`
                  : 'Enter full URL or just username'
              }
              error={!!(settings.socialLinks?.[key as PlatformKey] && !validatePlatformUrl(key as PlatformKey, settings.socialLinks[key as PlatformKey]!))}
              fullWidth
            />
          ))}
          
          <SettingsItem
            type="input"
            label="Custom Link Label"
            value={settings.socialLinks?.customLabel || ''}
            onValueChange={(value) => updateSetting('socialLinks.customLabel', value)}
            placeholder="My Website"
            helperText="Label for your custom link (max 30 characters)"
            fullWidth
          />
          
          <SettingsItem
            type="input"
            label="Custom Link URL"
            value={settings.socialLinks?.customUrl || ''}
            onValueChange={(value) => updateSetting('socialLinks.customUrl', value)}
            placeholder="https://example.com"
            helperText={
              settings.socialLinks?.customUrl && !validateCustomUrl(settings.socialLinks.customUrl)
                ? 'Invalid URL format'
                : 'Users will see a warning before opening this link'
            }
            error={!!(settings.socialLinks?.customUrl && !validateCustomUrl(settings.socialLinks.customUrl))}
            fullWidth
          />

          <SettingsItem
            type="toggle"
            label="Show Links to Followers Only"
            value={settings.socialLinks?.showLinksToFollowersOnly || false}
            onValueChange={(value) => updateSetting('socialLinks.showLinksToFollowersOnly', value)}
            helperText="When enabled, only your followers can see your social links (only applies to private profiles)"
          />
        </SettingsSection>

        {/* Account & Security Section */}
        <SettingsSection
          title="Account & Security"
          icon="shield-checkmark"
          expanded={sections.find(s => s.id === 'account')?.expanded || false}
          onToggle={() => toggleSection('account')}
        >
          <SettingsItem
            type="button"
            label="Change Password"
            onPress={handleChangePassword}
          />

          <SettingsItem
            type="toggle"
            label="Two-Factor Authentication"
            value={settings.twoFactorEnabled}
            onValueChange={(value) => updateSetting('twoFactorEnabled', value)}
            helperText="Add an extra layer of security to your account"
          />

          <SettingsItem
            type="button"
            label="Delete Account"
            onPress={handleDeleteAccount}
            destructive={true}
          />
        </SettingsSection>

        {/* Privacy & Visibility Section */}
        <SettingsSection
          title="Privacy & Visibility"
          icon="eye"
          expanded={sections.find(s => s.id === 'privacy')?.expanded || false}
          onToggle={() => toggleSection('privacy')}
        >
          <SettingsItem
            type="select"
            label="Profile Visibility"
            value={settings.profileVisibility}
            options={privacyOptions}
            onPress={() => openModal('privacy')}
          />

          <SettingsItem
            type="select"
            label="Who Can Message You"
            value={settings.messagePermission}
            options={permissionOptions}
            onPress={() => openModal('message')}
          />

          <SettingsItem
            type="button"
            label="Blocked Users"
            onPress={() => router.push('/blocked-users')}
          />
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection
          title="Notifications"
          icon="notifications"
          expanded={sections.find(s => s.id === 'notifications')?.expanded || false}
          onToggle={() => toggleSection('notifications')}
        >
          <SettingsItem
            type="toggle"
            label="New Followers"
            value={settings.notifications?.newFollowers}
            onValueChange={(value) => updateSetting('notifications.newFollowers', value)}
          />

          <SettingsItem
            type="toggle"
            label="Likes and Comments"
            value={settings.notifications?.likesAndComments}
            onValueChange={(value) => updateSetting('notifications.likesAndComments', value)}
          />

          <SettingsItem
            type="toggle"
            label="Direct Messages"
            value={settings.notifications?.directMessages}
            onValueChange={(value) => updateSetting('notifications.directMessages', value)}
          />

          <SettingsItem
            type="toggle"
            label="Follow Request Accepted"
            value={settings.notifications?.followRequestAccepted}
            onValueChange={(value) => updateSetting('notifications.followRequestAccepted', value)}
          />

          <SettingsItem
            type="toggle"
            label="Tagged in Comments"
            value={settings.notifications?.taggedInComments}
            onValueChange={(value) => updateSetting('notifications.taggedInComments', value)}
          />

          <SettingsItem
            type="toggle"
            label="Mentioned in Replies"
            value={settings.notifications?.mentionedInReplies}
            onValueChange={(value) => updateSetting('notifications.mentionedInReplies', value)}
          />
        </SettingsSection>

        {/* UI/UX Preferences Section */}
        <SettingsSection
          title="UI/UX Preferences"
          icon="settings"
          expanded={sections.find(s => s.id === 'preferences')?.expanded || false}
          onToggle={() => toggleSection('preferences')}
        >
          <SettingsItem
            type="select"
            label="Theme"
            value={settings.theme}
            options={themeOptions}
            onPress={() => {}}
            disabled={true}
            helperText="Coming Soon"
          />

          <SettingsItem
            type="select"
            label="Language"
            value={settings.language}
            options={languageOptions}
            onPress={() => {}}
            disabled={true}
            helperText="Coming Soon"
          />

          <SettingsItem
            type="select"
            label="Weight Unit"
            value={settings.units?.weight}
            options={[
              { label: 'Metric (kg)', value: 'metric' },
              { label: 'Imperial (lbs)', value: 'imperial' }
            ]}
            onPress={() => openModal('weightUnit')}
          />

          <SettingsItem
            type="select"
            label="Distance Unit"
            value={settings.units?.distance}
            options={[
              { label: 'Metric (km)', value: 'metric' },
              { label: 'Imperial (mi)', value: 'imperial' }
            ]}
            onPress={() => openModal('distanceUnit')}
          />
        </SettingsSection>

        {/* Miscellaneous Section */}
        <SettingsSection
          title="Miscellaneous"
          icon="ellipsis-horizontal"
          expanded={sections.find(s => s.id === 'misc')?.expanded || false}
          onToggle={() => toggleSection('misc')}
        >
          <SettingsItem
            type="button"
            label="Clear Chat History"
            onPress={() => {
              Alert.alert(
                "Clear Chat History",
                "This will permanently delete all your chat messages. This action cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  { 
                    text: "Clear", 
                    style: "destructive",
                    onPress: clearChatHistory
                  }
                ]
              );
            }}
          />

          <SettingsItem
            type="button"
            label="Clear Search History"
            onPress={() => {
              Alert.alert(
                "Clear Search History",
                "This will remove all your recent searches.",
                [
                  { text: "Cancel", style: "cancel" },
                  { 
                    text: "Clear", 
                    style: "destructive",
                    onPress: clearSearchHistory
                  }
                ]
              );
            }}
          />

          <SettingsItem
            type="info"
            label="App Version"
            value={getFullVersionString()}
          />

          <SettingsItem
            type="button"
            label="Privacy Policy"
            onPress={() => router.push('/privacy-policy')}
          />

          <SettingsItem
            type="button"
            label="Terms of Service"
            onPress={() => router.push('/terms-of-service')}
          />
        </SettingsSection>

        {/* Advanced Section */}
        <SettingsSection
          title="Advanced"
          icon="cog"
          expanded={sections.find(s => s.id === 'advanced')?.expanded || false}
          onToggle={() => toggleSection('advanced')}
        >
          {/* Privacy Level Indicator */}
          <View style={styles.privacyLevelContainer}>
            <Text style={styles.privacyLevelTitle}>Privacy Level</Text>
            <View style={[
              styles.privacyLevelBadge,
              { backgroundColor: 
                privacyLevel === 'strict' ? '#34C759' : 
                privacyLevel === 'moderate' ? '#FF9500' : '#FF3B30' 
              }
            ]}>
              <Text style={styles.privacyLevelText}>
                {privacyLevel.charAt(0).toUpperCase() + privacyLevel.slice(1)}
              </Text>
            </View>
          </View>

          {/* Insights */}
          <SettingsItem
            type="button"
            label={`Privacy Insights (${insights.length})`}
            onPress={() => openModal('insights')}
          />

          <SettingsItem
            type="button"
            label="Export Settings"
            onPress={handleExportSettings}
          />

          <SettingsItem
            type="button"
            label="Import Settings"
            onPress={handleImportSettings}
          />

          <SettingsItem
            type="button"
            label="Restore from Backup"
            onPress={handleRestoreBackup}
          />

          <SettingsItem
            type="button"
            label="Reset to Defaults"
            onPress={handleResetToDefaults}
            destructive={true}
          />
        </SettingsSection>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Network Status Indicator */}
          {!isOnline && (
            <View style={styles.networkStatusIndicator}>
              <Ionicons name="wifi-outline" size={16} color="#FF3B30" />
              <Text style={styles.networkStatusText}>
                No internet connection - changes will be saved when online
              </Text>
            </View>
          )}

          {/* Auto-save Status */}
          {lastAutoSave && (
            <View style={styles.autoSaveIndicator}>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              <Text style={styles.autoSaveText}>
                Auto-saved {lastAutoSave.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}

          {/* Unsaved Changes Indicator */}
          {hasUnsavedChanges && (
            <View style={styles.unsavedChangesIndicator}>
              <Ionicons name="warning" size={16} color="#FF9500" />
              <Text style={styles.unsavedChangesText}>
                You have unsaved changes
                {autoSaveEnabled && isOnline ? ' (auto-saving in 5s)' : ''}
              </Text>
            </View>
          )}
          
          {/* Save Button */}
          <TouchableOpacity 
            style={[
              styles.saveButton,
              hasUnsavedChanges && styles.saveButtonHighlighted,
              !isOnline && styles.saveButtonDisabled
            ]} 
            onPress={handleSaveSettings}
            disabled={loading || !isOnline}
          >
            <View style={styles.saveButtonContent}>
              {loading && <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />}
              <Text style={[
                styles.saveButtonText,
                !isOnline && styles.saveButtonTextDisabled
              ]}>
                {loading ? 'Saving...' : 
                !isOnline ? 'No Connection' :
                hasUnsavedChanges ? 'Save Changes' : 'Settings Saved'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Auto-save Toggle */}
          <View style={styles.autoSaveToggle}>
            <Text style={styles.autoSaveToggleLabel}>Auto-save changes</Text>
            <TouchableOpacity
              style={[styles.toggleSwitch, autoSaveEnabled && styles.toggleSwitchActive]}
              onPress={() => setAutoSaveEnabled(!autoSaveEnabled)}
            >
              <View style={[styles.toggleThumb, autoSaveEnabled && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Date Picker */}
        {dateModalVisible && (
          <View style={styles.modalOverlay}>
            <View style={styles.dateModal}>
              <View style={styles.dateModalHeader}>
                <Text style={styles.dateModalTitle}>Select Date of Birth</Text>
                <TouchableOpacity onPress={() => setDateModalVisible(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <DateTimePicker
                value={settings.dateOfBirth || new Date(2000, 0, 1)}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate && event.type !== 'dismissed') {
                    const now = new Date();
                    const minDate = new Date(1900, 0, 1);
                    
                    if (selectedDate > now) {
                      Alert.alert("Invalid Date", "Date of birth cannot be in the future");
                      return;
                    }
                    
                    if (selectedDate < minDate) {
                      Alert.alert("Invalid Date", "Please enter a valid date of birth");
                      return;
                    }
                    
                    // Use selectedDate directly - no need to "clean" it
                    updateSetting('dateOfBirth', selectedDate);
                  }
                }}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                style={{ backgroundColor: '#1C1C1E' }}
              />
              
              <TouchableOpacity 
                style={styles.dateModalDoneButton}
                onPress={() => setDateModalVisible(false)}
              >
                <Text style={styles.dateModalDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
        settings={settings}
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
    backgroundColor: 'black',
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  changePhotoButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changePhotoText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    marginTop: 32,
    marginBottom: 50,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  privacyLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
  },
  privacyLevelTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  privacyLevelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  privacyLevelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  privacyLevelLabel: {
    color: '#fff',
    fontSize: 14,
    marginRight: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  insightsModal: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxHeight: '70%',
    width: '90%',
  },
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  insightsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    color: '#999',
    fontSize: 18,
    padding: 4,
  },
  privacyLevelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
  },
  insightsList: {
    maxHeight: 300,
  },
  insightItem: {
    backgroundColor: '#2C2C2E',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  insightText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  noInsightsText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  unsavedChangesIndicator: {
    backgroundColor: '#FF9500',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  unsavedChangesText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButtonHighlighted: {
    backgroundColor: '#FF9500',
    transform: [{ scale: 1.02 }],
  },
  iosDatePickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1C1C1E',
    paddingTop: 20,
    paddingBottom: 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 1000,
  },
  iosDatePicker: {
    backgroundColor: '#1C1C1E',
  },
  iosDatePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  datePickerButton: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  datePickerDoneButton: {
    backgroundColor: '#007AFF',
  },
  datePickerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  datePickerDoneText: {
    color: '#fff',
  },
  dateModal: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    width: '90%',
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  dateModalDoneButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  dateModalDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  placeholder: {
    width: 40,
  },
  networkStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  networkStatusText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  autoSaveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    alignSelf: 'center',
  },
  autoSaveText: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  
  // Enhanced Save Button
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
  
  // Auto-save Toggle
  autoSaveToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    marginBottom: 16,
  },
  autoSaveToggleLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  toggleSwitch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#666',
    justifyContent: 'center',
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#34C759',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
});