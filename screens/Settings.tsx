import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth, functions } from '@/firebaseConfig';
import { signOut, sendPasswordResetEmail } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getOptimalImageUrl } from '@/utils/imageUtils';
import { CustomSelector, SelectorItem } from '@/components/CustomSelector';
import { generateUniqueFilename } from '@/logic/idGenerator';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingsItem } from '@/components/settings/SettingsItem';
import { UserSettings, SettingsSection as SettingsSectionType } from '@/types/settings';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { validateSettings, sanitizeSettings } from '@/utils/settingsValidation';
import { createSettingsBackup, restoreSettingsBackup, getSettingsHistory } from '@/utils/settingsBackup';
import { exportSettings, importSettings } from '@/utils/settingsExport';
import { trackSettingsChange, generateSettingsInsights, calculatePrivacyLevel } from '@/utils/settingsAnalytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// Data constants
const archetypeData: SelectorItem[] = [
  { 
    label: 'Athlete', 
    value: 'athlete', 
    image: require('@/assets/images/athlete.png'),
    description: 'Focused on athletic performance and competition'
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
  { label: 'Public', value: 'public', icon: 'earth' },
  { label: 'Followers Only', value: 'followers', icon: 'people' },
  { label: 'Private', value: 'private', icon: 'lock-closed' },
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
    followPermission: 'anyone',
    commentPermission: 'everyone',
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

  const [profileImage, setProfileImage] = useState(userProfile?.profileImageUrl);
  const [archetypeModalVisible, setArchetypeModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [weightUnitModalVisible, setWeightUnitModalVisible] = useState(false);
  const [distanceUnitModalVisible, setDistanceUnitModalVisible] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  const [showInsights, setShowInsights] = useState(false);
  const [privacyLevel, setPrivacyLevel] = useState<'open' | 'moderate' | 'strict'>('moderate');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<Partial<UserSettings>>({});


  // Update settings when userProfile changes
  useEffect(() => {
    if (userProfile) {
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
        followPermission: userProfile.followPermission || 'anyone',
        commentPermission: userProfile.commentPermission || 'everyone',
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
      }));
      setProfileImage(userProfile.profileImageUrl);
    }
  }, [userProfile]);

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
        followPermission: userProfile.followPermission || 'anyone',
        commentPermission: userProfile.commentPermission || 'everyone',
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
      };

      setOriginalSettings(originalSettingsData);
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
      setHasUnsavedChanges(hasChanges);
    }
  }, [settings, originalSettings]);

  const handleBackPress = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Do you want to save them before leaving?",
        [
          { 
            text: "Discard", 
            style: "destructive", 
            onPress: () => {
              setHasUnsavedChanges(false);
              router.back();
            }
          },
          { text: "Cancel", style: "cancel" },
          { 
            text: "Save", 
            onPress: async () => {
              await handleSaveSettings();
              router.back();
            }
          }
        ]
      );
    } else {
      router.back();
    }
  };

  const toggleSection = (sectionId: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, expanded: !section.expanded }
        : section
    ));
  };

  const updateSetting = (key: string, value: any) => {
    const oldValue = key.includes('.') 
      ? key.split('.').reduce((obj, k) => obj?.[k], settings)
      : settings[key as keyof typeof settings];

    setSettings(prev => {
      if (key.includes('.')) {
        const keys = key.split('.');
        const newSettings = { ...prev };
        let current: any = newSettings;
        
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {};
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

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your photos to update your profile picture.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });
      
      if (result.canceled || !result.assets || !result.assets.length) {
        return;
      }
      
      setLoading(true);
      
      const uri = result.assets[0].uri;
      const storage = getStorage();
      const metadata = {
        customMetadata: {
          userId: currentUser.uid,
          type: 'profileImage'
        }
      };
      const filename = generateUniqueFilename('profile', 'jpg');
      const storageRef = ref(storage, `profileImages/${filename}`);
      
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        
        if (blob.size > 5000000) {
          Alert.alert("Image too large", "Please select a smaller image or use lower quality");
          setLoading(false);
          return;
        }
        
        await uploadBytes(storageRef, blob, metadata);
        const downloadURL = await getDownloadURL(storageRef);
        
        setProfileImage(downloadURL);
        
        await updateDoc(doc(db, "users", currentUser.uid), {
          profileImageUrl: downloadURL,
        });
        
      } catch (error) {
        console.error("Image upload failed:", error);
        Alert.alert("Upload Failed", "Could not upload image. Please try again later.");
      }
    } catch (error) {
      console.error("Error in image picking process:", error);
      Alert.alert("Error", "Failed to update profile picture");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Validate settings first
      const validation = validateSettings(settings);
      
      if (!validation.isValid) {
        Alert.alert(
          'Invalid Settings',
          'Please fix the following issues:\n' + validation.errors.join('\n'),
          [{ text: 'OK' }]
        );
        return;
      }

      // Show warnings if any
      if (validation.warnings.length > 0) {
        Alert.alert(
          'Warning',
          validation.warnings.join('\n'),
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
            { text: 'Continue', onPress: () => saveSettingsAfterValidation() }
          ]
        );
        return;
      }

      await saveSettingsAfterValidation();
    } catch (error) {
      console.error("Error updating settings:", error);
      Alert.alert("Error", "Failed to update settings: " + (error?.message || 'Unknown error'));
      setLoading(false);
    }
  };

  const saveSettingsAfterValidation = async () => {
    try {
      // Sanitize settings
      const sanitizedSettings = sanitizeSettings(settings);
      
      // Create backup before saving
      await createSettingsBackup(sanitizedSettings);
      
      // Prepare settings for saving
      const settingsToSave = {
        ...sanitizedSettings,
        dateOfBirth: sanitizedSettings.dateOfBirth ? sanitizedSettings.dateOfBirth.toISOString() : null,
      };
      
      // Save using existing logic...
      if (!functions || !functions.app) {
        console.warn('Functions not properly initialized, falling back to direct Firestore update');
        
        await updateDoc(doc(db, "users", currentUser!.uid), {
          ...settingsToSave,
          lastModified: new Date(),
          version: 1,
        });
      } else {
        try {
          const updateUserSettings = httpsCallable(functions, 'updateUserSettings');
          await updateUserSettings({ settings: settingsToSave });
          console.log('Settings updated via Cloud Function');
        } catch (functionError) {
          console.error('Cloud Function failed, falling back to direct update:', functionError);
          
          await updateDoc(doc(db, "users", currentUser!.uid), {
            ...settingsToSave,
            lastModified: new Date(),
            version: 1,
          });
        }
      }
      
      // Update profile image if changed
      if (profileImage !== userProfile?.profileImageUrl) {
        await updateDoc(doc(db, "users", currentUser!.uid), {
          profileImageUrl: profileImage,
        });
      }
      
      await refreshUserProfile();
      
      // Update original settings to current settings after successful save
      setOriginalSettings({ ...settings }); // This will clear the unsaved changes indicator
      setHasUnsavedChanges(false);
      
      Alert.alert("Success", "Settings updated successfully");
    } catch (error) {
      console.error("Error in saveSettingsAfterValidation:", error);
      Alert.alert("Error", "Failed to update settings: " + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportSettings = async () => {
    if (!currentUser || !userProfile) return;
    
    const success = await exportSettings(settings, currentUser.uid, userProfile.username);
    if (success) {
      Alert.alert("Success", "Settings exported successfully!");
    }
  };

  const handleImportSettings = async () => {
    const importedSettings = await importSettings();
    if (importedSettings) {
      Alert.alert(
        "Import Settings",
        "This will replace your current settings. Are you sure?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Import",
            onPress: () => {
              setSettings(prev => ({ ...prev, ...importedSettings }));
              Alert.alert("Success", "Settings imported successfully!");
            }
          }
        ]
      );
    }
  };

  const handleRestoreBackup = async () => {
    const backup = await restoreSettingsBackup();
    if (backup) {
      Alert.alert(
        "Restore Backup",
        "This will restore your settings from the last backup. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore",
            onPress: () => {
              setSettings(prev => ({ ...prev, ...backup }));
              Alert.alert("Success", "Settings restored from backup!");
            }
          }
        ]
      );
    } else {
      Alert.alert("No Backup", "No backup found to restore from.");
    }
  };

  const handleResetToDefaults = () => {
    Alert.alert(
      "Reset to Defaults",
      "This will reset all settings to their default values. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            setSettings({
              displayName: userProfile?.displayName || '',
              bio: '',
              archetype: '',
              profileVisibility: 'public',
              followPermission: 'anyone',
              commentPermission: 'everyone',
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
            });
            Alert.alert("Success", "Settings reset to defaults!");
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action cannot be undone. Type 'DELETE' to confirm account deletion.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Continue", 
          style: "destructive",
          onPress: () => {
            Alert.prompt(
              "Confirm Deletion",
              "Type 'DELETE' to permanently delete your account:",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete Account",
                  style: "destructive",
                  onPress: async (text) => {
                    if (text === 'DELETE') {
                      try {
                        setLoading(true);
                        
                        if (!functions || !functions.app) {
                          Alert.alert("Error", "Cloud functions not available. Account deletion requires server-side processing.");
                          return;
                        }
                        
                        const deleteUserAccount = httpsCallable(functions, 'deleteUserAccount');
                        await deleteUserAccount({ 
                          confirmationToken: `DELETE_${currentUser.uid}` 
                        });
                        
                        Alert.alert("Account Deleted", "Your account has been permanently deleted.");
                        router.replace('/');
                      } catch (error) {
                        console.error('Error deleting account:', error);
                        Alert.alert("Error", "Failed to delete account: " + (error?.message || 'Unknown error'));
                      } finally {
                        setLoading(false);
                      }
                    } else {
                      Alert.alert("Invalid Input", "You must type 'DELETE' exactly to confirm.");
                    }
                  }
                }
              ],
              "plain-text"
            );
          }
        }
      ]
    );
  };

  const clearChatHistory = async () => {
    try {
      setLoading(true);
      
      if (!functions || !functions.app) {
        Alert.alert("Error", "Cloud functions not available. Please try again later.");
        return;
      }
      
      const clearUserData = httpsCallable(functions, 'clearUserData');
      await clearUserData({ dataType: 'chatHistory' });
      Alert.alert("Success", "Chat history cleared successfully");
    } catch (error) {
      console.error('Error clearing chat history:', error);
      Alert.alert("Error", "Failed to clear chat history: " + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const clearSearchHistory = async () => {
    try {
      setLoading(true);
      
      if (!functions || !functions.app) {
        Alert.alert("Error", "Cloud functions not available. Please try again later.");
        return;
      }
      
      const clearUserData = httpsCallable(functions, 'clearUserData');
      await clearUserData({ dataType: 'searchHistory' });
      Alert.alert("Success", "Search history cleared successfully");
    } catch (error) {
      console.error('Error clearing search history:', error);
      Alert.alert("Error", "Failed to clear search history: " + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = () => {
    Alert.alert(
      "Change Password",
      "You will receive an email with instructions to reset your password.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Email",
          onPress: async () => {
            try {
              const { sendPasswordResetEmail } = await import('firebase/auth');
              await sendPasswordResetEmail(auth, currentUser?.email || '');
              Alert.alert("Success", "Password reset email sent! Check your inbox.");
            } catch (error) {
              console.error('Password reset error:', error);
              Alert.alert("Error", "Failed to send password reset email. Please try again.");
            }
          }
        }
      ]
    );
  };

  console.log('archetypeModalVisible:', archetypeModalVisible);

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
                uri: getOptimalImageUrl(userProfile?.profileThumbnailUrl, profileImage) || 
                    'https://thumbs.dreamstime.com/b/creative-illustration-default-avatar-profile-placeholder-isolated-background-art-design-grey-photo-blank-template-mockup-144855718.jpg' 
              }} 
              style={styles.profileImage} 
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
          />

          <SettingsItem
            type="input"
            label="Bio"
            value={settings.bio}
            onValueChange={(value) => updateSetting('bio', value)}
            placeholder="Tell us about yourself"
          />

          <SettingsItem
            type="select"
            label="Date of Birth"
            value={settings.dateOfBirth}
            onPress={() => {
              console.log('Date picker button pressed');
              setDateModalVisible(true);
            }}
            placeholder="Select your birth date"
            helperText="Used for age-based recommendations"
            displayValue={settings.dateOfBirth ? 
              settings.dateOfBirth.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 
              'Select your birth date'
            }
          />

          <SettingsItem
            type="select"
            label="Archetype"
            value={settings.archetype}
            onPress={() => setArchetypeModalVisible(true)}
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
            onPress={() => setPrivacyModalVisible(true)}
          />

          <SettingsItem
            type="select"
            label="Who Can Follow You"
            value={settings.followPermission}
            options={followOptions}
            onPress={() => setFollowModalVisible(true)}
          />

          <SettingsItem
            type="select"
            label="Who Can Comment"
            value={settings.commentPermission}
            options={permissionOptions}
            onPress={() => setCommentModalVisible(true)}
          />

          <SettingsItem
            type="select"
            label="Who Can Message You"
            value={settings.messagePermission}
            options={permissionOptions}
            onPress={() => setMessageModalVisible(true)}
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
            onPress={() => setThemeModalVisible(true)}
          />

          <SettingsItem
            type="select"
            label="Language"
            value={settings.language}
            options={languageOptions}
            onPress={() => setLanguageModalVisible(true)}
          />

          <SettingsItem
            type="select"
            label="Weight Unit"
            value={settings.units?.weight}
            options={[
              { label: 'Metric (kg)', value: 'metric' },
              { label: 'Imperial (lbs)', value: 'imperial' }
            ]}
            onPress={() => setWeightUnitModalVisible(true)}
          />

          <SettingsItem
            type="select"
            label="Distance Unit"
            value={settings.units?.distance}
            options={[
              { label: 'Metric (km)', value: 'metric' },
              { label: 'Imperial (mi)', value: 'imperial' }
            ]}
            onPress={() => setDistanceUnitModalVisible(true)}
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
            value="1.0.0"
          />

          <SettingsItem
            type="button"
            label="Privacy Policy"
            onPress={() => Alert.alert("Coming Soon", "Privacy policy will be available in a future update.")}
          />

          <SettingsItem
            type="button"
            label="Terms of Service"
            onPress={() => Alert.alert("Coming Soon", "Terms of service will be available in a future update.")}
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
            onPress={() => setShowInsights(true)}
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
          {hasUnsavedChanges && (
            <View style={styles.unsavedChangesIndicator}>
              <Text style={styles.unsavedChangesText}>
                You have unsaved changes
              </Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={[
              styles.saveButton,
              hasUnsavedChanges && styles.saveButtonHighlighted
            ]} 
            onPress={handleSaveSettings}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Settings Saved'}
            </Text>
          </TouchableOpacity>

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
                  console.log('Date picker event:', event, 'Selected date:', selectedDate);
                  
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
                    
                    const cleanDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                    console.log('Setting date to:', cleanDate);
                    updateSetting('dateOfBirth', cleanDate);
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

      {/* Only render CustomSelector when modal should be visible */}
      {archetypeModalVisible && (
        <CustomSelector
          items={archetypeData}
          value={settings.archetype || null}
          onSelect={(value) => updateSetting('archetype', value)}
          placeholder="Select archetype"
          title="Archetype"
          icon="body"
          modalVisible={archetypeModalVisible}
          setModalVisible={setArchetypeModalVisible}
          variant="fullWidth"
        />
      )}

      {/* Privacy Modals */}
      {privacyModalVisible && (
        <CustomSelector
          items={privacyOptions.map(opt => ({ 
            label: opt.label, 
            value: opt.value,
            icon: opt.icon,
            description: opt.value === 'public' ? 'Anyone can see your profile' :
                        opt.value === 'followers' ? 'Only your followers can see your profile' :
                        'Only you can see your profile'
          }))}
          value={settings.profileVisibility}
          onSelect={(value) => updateSetting('profileVisibility', value)}
          placeholder="Select visibility"
          title="Profile Visibility"
          icon="eye"
          modalVisible={privacyModalVisible}
          setModalVisible={setPrivacyModalVisible}
          variant="fullWidth"
        />
      )}

      {followModalVisible && (
        <CustomSelector
          items={followOptions.map(opt => ({ 
            label: opt.label, 
            value: opt.value,
            icon: opt.icon,
            description: opt.value === 'anyone' ? 'Anyone can follow you' : 'You must approve follow requests'
          }))}
          value={settings.followPermission}
          onSelect={(value) => updateSetting('followPermission', value)}
          placeholder="Select follow permission"
          title="Who Can Follow You"
          icon="person-add"
          modalVisible={followModalVisible}
          setModalVisible={setFollowModalVisible}
          variant="fullWidth"
        />
      )}

      {commentModalVisible && (
        <CustomSelector
          items={permissionOptions.map(opt => ({ 
            label: opt.label, 
            value: opt.value,
            icon: opt.icon,
            description: opt.value === 'everyone' ? 'Anyone can comment on your posts' : 'Only followers can comment'
          }))}
          value={settings.commentPermission}
          onSelect={(value) => updateSetting('commentPermission', value)}
          placeholder="Select comment permission"
          title="Who Can Comment"
          icon="chatbubble"
          modalVisible={commentModalVisible}
          setModalVisible={setCommentModalVisible}
          variant="fullWidth"
        />
      )}

      {messageModalVisible && (
        <CustomSelector
          items={permissionOptions.map(opt => ({ 
            label: opt.label, 
            value: opt.value,
            icon: opt.icon,
            description: opt.value === 'everyone' ? 'Anyone can message you' : 'Only followers can message you'
          }))}
          value={settings.messagePermission}
          onSelect={(value) => updateSetting('messagePermission', value)}
          placeholder="Select message permission"
          title="Who Can Message You"
          icon="mail"
          modalVisible={messageModalVisible}
          setModalVisible={setMessageModalVisible}
          variant="fullWidth"
        />
      )}

      {/* Preference Modals */}
      {themeModalVisible && (
        <CustomSelector
          items={themeOptions.map(opt => ({ 
            label: opt.label, 
            value: opt.value,
            icon: opt.icon,
            description: opt.value === 'light' ? 'Light color scheme' :
                        opt.value === 'dark' ? 'Dark color scheme' :
                        'Follow device settings'
          }))}
          value={settings.theme}
          onSelect={(value) => updateSetting('theme', value)}
          placeholder="Select theme"
          title="App Theme"
          icon="color-palette"
          modalVisible={themeModalVisible}
          setModalVisible={setThemeModalVisible}
          variant="fullWidth"
        />
      )}

      {languageModalVisible && (
        <CustomSelector
          items={languageOptions.map(opt => ({ 
            label: opt.label, 
            value: opt.value,
            icon: opt.icon
          }))}
          value={settings.language}
          onSelect={(value) => updateSetting('language', value)}
          placeholder="Select language"
          title="App Language"
          icon="globe"
          modalVisible={languageModalVisible}
          setModalVisible={setLanguageModalVisible}
          variant="fullWidth"
        />
      )}

      {weightUnitModalVisible && (
        <CustomSelector
          items={[
            { label: 'Metric (kg)', value: 'metric', icon: 'barbell', description: 'Kilograms for weight measurements' },
            { label: 'Imperial (lbs)', value: 'imperial', icon: 'barbell', description: 'Pounds for weight measurements' }
          ]}
          value={settings.units?.weight}
          onSelect={(value) => updateSetting('units.weight', value)}
          placeholder="Select weight unit"
          title="Weight Unit"
          icon="barbell"
          modalVisible={weightUnitModalVisible}
          setModalVisible={setWeightUnitModalVisible}
          variant="fullWidth"
        />
      )}

      {distanceUnitModalVisible && (
        <CustomSelector
          items={[
            { label: 'Metric (km)', value: 'metric', icon: 'walk', description: 'Kilometers for distance measurements' },
            { label: 'Imperial (mi)', value: 'imperial', icon: 'walk', description: 'Miles for distance measurements' }
          ]}
          value={settings.units?.distance}
          onSelect={(value) => updateSetting('units.distance', value)}
          placeholder="Select distance unit"
          title="Distance Unit"
          icon="walk"
          modalVisible={distanceUnitModalVisible}
          setModalVisible={setDistanceUnitModalVisible}
          variant="fullWidth"
        />
      )}

      {/* Insights Modal */}
      {showInsights && (
        <View style={styles.modalOverlay}>
          <View style={styles.insightsModal}>
            <View style={styles.insightsHeader}>
              <Text style={styles.insightsTitle}>Privacy Insights</Text>
              <TouchableOpacity onPress={() => setShowInsights(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.privacyLevelSection}>
              <Text style={styles.privacyLevelLabel}>Your Privacy Level:</Text>
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

            <View style={styles.insightsList}>
              {insights.map((insight, index) => (
                <View key={index} style={styles.insightItem}>
                  <Text style={styles.insightText}>{insight}</Text>
                </View>
              ))}
              
              {insights.length === 0 && (
                <Text style={styles.noInsightsText}>
                  No insights available. Your settings look good! 👍
                </Text>
              )}
            </View>
          </View>
        </View>
      )}
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
});