import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Keyboard, Alert, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth, functions } from '@/firebaseConfig';
import { signOut, sendPasswordResetEmail } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getOptimalImageUrl, deleteImageFromStorage } from '@/utils/imageUtils';
import { CustomSelector, SelectorItem } from '@/components/CustomSelector';
import { generateUniqueFilename } from '@/logic/idGenerator';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingsItem } from '@/components/settings/SettingsItem';
import { UserSettings, SettingsSection as SettingsSectionType } from '@/types/settings';
import DateTimePicker from '@react-native-community/datetimepicker';
import { validateSettings, sanitizeSettings } from '@/utils/settingsValidation';
import { createSettingsBackup, restoreSettingsBackup } from '@/utils/settingsBackup';
import { exportSettings, importSettings } from '@/utils/settingsExport';
import { trackSettingsChange, generateSettingsInsights, calculatePrivacyLevel } from '@/utils/settingsAnalytics';
import { Ionicons } from '@expo/vector-icons';
import { uploadProfileThumbnail } from '@/services/profileStorage';
import NetInfo from '@react-native-community/netinfo';
import { getFullVersionString } from '@/utils/appVersion';

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
      }));
      if (!imageManuallyChanged) {
        setProfileImage(userProfile.profileImageUrl);
      }
    }
  }, [userProfile, isSaving]);

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
      const profileImageChanged = profileImage !== userProfile?.profileImageUrl;
      
      setHasUnsavedChanges(hasChanges || profileImageChanged);
    }
  }, [settings, originalSettings, profileImage, userProfile?.profileImageUrl]);

  useEffect(() => {
    console.log('🖼️ Profile Image State:', {
      profileImage,
      userProfileImage: userProfile?.profileImageUrl,
      isSaving,
      hasUnsavedChanges
    });
  }, [profileImage, userProfile?.profileImageUrl, isSaving, hasUnsavedChanges]);

  useEffect(() => {
    // Monitor network connectivity
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
      console.log('Network status:', state.isConnected ? 'Online' : 'Offline');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Auto-save functionality
    if (!hasUnsavedChanges || !autoSaveEnabled || !isOnline || isSaving) {
      return;
    }

    const autoSaveTimer = setTimeout(async () => {
      try {
        console.log('🔄 Auto-saving settings...');
        await handleSaveSettings();
        setLastAutoSave(new Date());
        console.log('✅ Auto-save completed');
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
        // Don't show alert for auto-save failures to avoid interrupting user
      }
    }, 5000); // Auto-save after 5 seconds of no changes

    return () => clearTimeout(autoSaveTimer);
  }, [hasUnsavedChanges, autoSaveEnabled, isOnline, isSaving, settings]);

  useEffect(() => {
    console.log('🔄 Modal State Debug:', {
      activeModal,
      modalQueue,
      lastModalAction: new Date(lastModalAction).toLocaleTimeString(),
      hasUnsavedChanges
    });
  }, [activeModal, modalQueue, lastModalAction, hasUnsavedChanges]);

  const openModal = useCallback((modalId: string) => {
    Keyboard.dismiss();
  
    const now = Date.now();
    if (now - lastModalAction < MODAL_DEBOUNCE_MS) {
      console.log('Modal action debounced');
      return;
    }
    
    // Close any currently active modal first
    if (activeModal && activeModal !== modalId) {
      console.log(`Closing ${activeModal} to open ${modalId}`);
      closeModal(activeModal);
      
      // Queue the new modal to open after current one closes
      setModalQueue(prev => [...prev, modalId]);
      return;
    }
    
    setActiveModal(modalId);
    setLastModalAction(now);
    console.log(`Opened modal: ${modalId}`);
  }, [activeModal, lastModalAction]);

  const closeModal = useCallback((modalId: string) => {
    const now = Date.now();
    if (now - lastModalAction < MODAL_DEBOUNCE_MS) {
      console.log('Modal close debounced');
      return;
    }
    
    if (activeModal === modalId) {
      setActiveModal(null);
      setLastModalAction(now);
      console.log(`Closed modal: ${modalId}`);
      
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
        Alert.alert('Permission Denied', 'We need access to your photos …');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });
      if (result.canceled || !result.assets?.length) return;

      setLoading(true);
      const { uri } = result.assets[0];
      const response = await fetch(uri);
      const blob = await response.blob();

      if (blob.size > 5_000_000) {
        Alert.alert('Image too large', 'Please select a smaller image');
        setLoading(false);
        return;
      }

      try {
        const downloadURL = await uploadProfileThumbnail(currentUser.uid, blob);
        setProfileImage(downloadURL);
        setImageManuallyChanged(true);
        Alert.alert('Success', "Profile photo updated! Don't forget to save.");
      } catch (e) {
        console.error('Thumbnail upload failed:', e);
        Alert.alert('Upload Failed', 'Could not upload image. Try again later.');
      }
    } catch (error) {
      console.error('Error in image picking process:', error);
      Alert.alert('Error', 'Failed to update profile picture');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!currentUser) return;
    
    // Check network connectivity
    if (!isOnline) {
      Alert.alert(
        'No Internet Connection',
        'Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
      return;
    }
    
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
      
      // Enhanced error handling
      const errorMessage = error?.code === 'unavailable' 
        ? 'Service temporarily unavailable. Please try again.'
        : error?.code === 'permission-denied'
        ? 'You don\'t have permission to update these settings.'
        : 'Failed to update settings: ' + (error?.message || 'Unknown error');
      
      Alert.alert("Error", errorMessage);
      setLoading(false);
    }
  };

  const saveSettingsAfterValidation = async () => {
    try {
      setIsSaving(true);
      const sanitizedSettings = sanitizeSettings(settings);
      
      // Keep track of the old image URL to delete it after a successful update
      const oldImageUrl = userProfile?.profileImageUrl;
      const newImageUrl = profileImage;
      const imageHasChanged = oldImageUrl && oldImageUrl !== newImageUrl;

      // Create backup before saving
      await createSettingsBackup(sanitizedSettings);
      
      const settingsToSave = {
        ...sanitizedSettings,
        dateOfBirth: sanitizedSettings.dateOfBirth ? sanitizedSettings.dateOfBirth.toISOString() : null,
        profileImageUrl: newImageUrl,
        profileVisibility: sanitizedSettings.profileVisibility,
      };
      
      console.log('Saving settings with profile image:', {
        profileImageUrl: profileImage,
        settingsKeys: Object.keys(settingsToSave)
      });
      
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
          
          console.log('📤 Sending to Cloud Function:', {
            profileImageUrl: settingsToSave.profileImageUrl,
            userId: currentUser!.uid
          });
          
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
      
      if (imageHasChanged) {
        console.log(`Settings saved. Deleting old profile image: ${oldImageUrl}`);
        try {
          await deleteImageFromStorage(oldImageUrl);
        } catch (deleteError) {
          // Log the error but don't block the user flow, as the primary operation (saving settings) was successful.
          console.error("Non-critical error: Failed to delete old profile image.", deleteError);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await refreshUserProfile();
      
      setOriginalSettings({ ...settings });
      setHasUnsavedChanges(false);
      setImageManuallyChanged(false);
      
      Alert.alert("Success", "Settings updated successfully");
    } catch (error) {
      console.error("Error in saveSettingsAfterValidation:", error);
      Alert.alert("Error", "Failed to update settings: " + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
      setIsSaving(false);
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
              // Parse the dateOfBirth properly when importing
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
                  console.error('Error parsing date of birth from import:', error);
                  return undefined;
                }
              };

              // Process the imported data before setting it
              const processedImport = {
                ...importedSettings,
                dateOfBirth: parseDateOfBirth(importedSettings.dateOfBirth)
              };

              setSettings(prev => ({ ...prev, ...processedImport }));
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
              // Parse the dateOfBirth properly when restoring
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
                  
                  // Handle string dates (from backup)
                  if (typeof dateValue === 'string') {
                    const parsed = new Date(dateValue);
                    return isNaN(parsed.getTime()) ? undefined : parsed;
                  }
                  
                  return undefined;
                } catch (error) {
                  console.error('Error parsing date of birth from backup:', error);
                  return undefined;
                }
              };

              // Process the backup data before setting it
              const processedBackup = {
                ...backup,
                dateOfBirth: parseDateOfBirth(backup.dateOfBirth)
              };

              setSettings(prev => ({ ...prev, ...processedBackup }));
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
              console.log('Date picker button pressed');
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
            onPress={() => openModal('theme')}
          />

          <SettingsItem
            type="select"
            label="Language"
            value={settings.language}
            options={languageOptions}
            onPress={() => openModal('language')}
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
                    
                    // Use selectedDate directly - no need to "clean" it
                    console.log('Setting date to:', selectedDate);
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

      {isModalVisible('archetype') && (
        <CustomSelector
          items={archetypeData}
          value={settings.archetype || null}
          onSelect={(value) => updateSetting('archetype', value)}
          placeholder="Select archetype"
          title="Archetype"
          icon="body"
          modalVisible={isModalVisible('archetype')}
          setModalVisible={(visible) => visible ? openModal('archetype') : closeModal('archetype')}
          variant="fullWidth"
        />
      )}

      {isModalVisible('privacy') && (
        <CustomSelector
          items={privacyOptions}
          value={settings.profileVisibility ?? 'public'}
          onSelect={(value) => updateSetting('profileVisibility', value)}
          placeholder="Select visibility"
          title="Profile Visibility"
          icon="eye"
          modalVisible={isModalVisible('privacy')}
          setModalVisible={(visible) => visible ? openModal('privacy') : closeModal('privacy')}
          variant="fullWidth"
        />
      )}

      {isModalVisible('message') && (
        <CustomSelector
          items={permissionOptions.map(opt => ({ 
            label: opt.label, 
            value: opt.value,
            icon: opt.icon,
            description: opt.value === 'everyone' ? 'Anyone can message you' : 'Only followers can message you, unless you allow others'
          }))}
          value={settings.messagePermission}
          onSelect={(value) => updateSetting('messagePermission', value)}
          placeholder="Select message permission"
          title="Who Can Message You"
          icon="mail"
          modalVisible={isModalVisible('message')}
          setModalVisible={(visible) => visible ? openModal('message') : closeModal('message')}
          variant="fullWidth"
        />
      )}

      {isModalVisible('theme') && (
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
          modalVisible={isModalVisible('theme')}
          setModalVisible={(visible) => visible ? openModal('theme') : closeModal('theme')}
          variant="fullWidth"
        />
      )}

      {isModalVisible('language') && (
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
          modalVisible={isModalVisible('language')}
          setModalVisible={(visible) => visible ? openModal('language') : closeModal('language')}
          variant="fullWidth"
        />
      )}

      {isModalVisible('weightUnit') && (
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
          modalVisible={isModalVisible('weightUnit')}
          setModalVisible={(visible) => visible ? openModal('weightUnit') : closeModal('weightUnit')}
          variant="fullWidth"
        />
      )}

      {isModalVisible('distanceUnit') && (
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
          modalVisible={isModalVisible('distanceUnit')}
          setModalVisible={(visible) => visible ? openModal('distanceUnit') : closeModal('distanceUnit')}
          variant="fullWidth"
        />
      )}

      {isModalVisible('insights') && (
        <View style={styles.modalOverlay}>
          <View style={styles.insightsModal}>
            <View style={styles.insightsHeader}>
              <Text style={styles.insightsTitle}>Privacy Insights</Text>
              <TouchableOpacity onPress={() => closeModal('insights')}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.privacyLevelSection}>
              <Text style={styles.privacyLevelLabel}>Current Level:</Text>
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

            <ScrollView style={styles.insightsList} showsVerticalScrollIndicator={false}>
              {insights.length === 0 ? (
                <Text style={styles.noInsightsText}>
                  No insights available. Your settings look good! 👍
                </Text>
              ) : (
                insights.map((insight, index) => (
                  <View key={index} style={styles.insightItem}>
                    <Text style={styles.insightText}>{insight}</Text>
                  </View>
                ))
              )}
            </ScrollView>
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