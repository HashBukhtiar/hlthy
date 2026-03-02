import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { signOut } from 'firebase/auth';
import { auth, functions } from '@/firebaseConfig';
import { SettingsRepository } from '@/features/settings/infra/settingsRepository';
import { deleteImageFromStorage } from '@/utils/imageUtils';
import { UserSettings } from '@/types/settings';
import { validateSettings, sanitizeSettings } from '@/utils/settingsValidation';
import { createSettingsBackup, restoreSettingsBackup } from '@/utils/settingsBackup';
import { exportSettings, importSettings } from '@/utils/settingsExport';
import { uploadProfileImage } from '@/services/profileStorage';
import { NotificationService } from '@/services/NotificationService';
import * as ImagePicker from 'expo-image-picker';

interface UseSettingsHandlersProps {
  profileImage: string | undefined;
  originalProfileImage: string | undefined;
  settings: Partial<UserSettings>;
  userProfile: any;
  currentUser: any;
  hasUnsavedChanges: boolean;
  setProfileImage: (url: string | undefined) => void;
  setImageManuallyChanged: (changed: boolean) => void;
  setHasUnsavedChanges: (changed: boolean) => void;
  setLoading: (loading: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setSettings: (settings: Partial<UserSettings> | ((prev: Partial<UserSettings>) => Partial<UserSettings>)) => void;
  setOriginalSettings: (settings: Partial<UserSettings>) => void;
  setOriginalProfileImage: (url: string | undefined) => void;
  refreshUserProfile: () => Promise<void>;
}

export function useSettingsHandlers(props: UseSettingsHandlersProps) {
  const router = useRouter();
  const {
    profileImage,
    originalProfileImage,
    settings,
    userProfile,
    currentUser,
    setProfileImage,
    setImageManuallyChanged,
    setHasUnsavedChanges,
    setLoading,
    setIsSaving,
    setSettings,
    setOriginalSettings,
    setOriginalProfileImage,
    refreshUserProfile,
  } = props;

  const handleBackPress = useCallback(async () => {
    const hasUnsavedChanges = originalProfileImage !== profileImage;
    const hasUnsavedSettings = props.hasUnsavedChanges;
    
    if (!hasUnsavedChanges && !hasUnsavedSettings) {
      router.back();
      return;
    }

    Alert.alert(
      "Unsaved Changes",
      "You have unsaved changes. Do you want to save them before leaving?",
      [
        {
          text: "Discard",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete the temporary uploaded image if one exists
              if (profileImage !== originalProfileImage && profileImage) {
                try {
                  await deleteImageFromStorage(profileImage);
                } catch (deleteError) {
                  console.error('Error deleting temporary profile image:', deleteError);
                }
              }
            } catch (error) {
              console.error('Error during discard cleanup:', error);
            }

            // Restore Firebase document to original image URL
            try {
              if (currentUser?.uid) {
                await SettingsRepository.updateUser(currentUser.uid, {
                  profileImageUrl: originalProfileImage || null,
                  profileThumbnailUrl: null,
                });
              }
            } catch (updateError) {
              console.error('Error restoring Firebase document:', updateError);
            }

            // Reset state flags
            setImageManuallyChanged(false);
            setHasUnsavedChanges(false);
            setProfileImage(originalProfileImage);

            // Refresh the context to sync with the restored Firebase data
            try {
              await refreshUserProfile();
            } catch (refreshError) {
              console.error('Error refreshing AuthContext:', refreshError);
            }

            // Give React time to process state updates
            await new Promise(resolve => setTimeout(resolve, 300));
            router.back();
          },
        },
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: async () => {
            await handleSaveSettings();
            router.back();
          },
        },
      ]
    );
  }, [profileImage, originalProfileImage, router, userProfile, currentUser, setProfileImage, setImageManuallyChanged, setHasUnsavedChanges, refreshUserProfile]);

  const pickImage = useCallback(async () => {
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
        quality: 0.6,
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
        // Set imageManuallyChanged BEFORE uploading to prevent the useEffect 
        // in Settings.tsx from overwriting originalProfileImage when Firestore updates
        setImageManuallyChanged(true);
        
        const downloadURL = await uploadProfileImage(currentUser.uid, blob);
        setProfileImage(downloadURL);
        Alert.alert('Success', "Profile photo updated! Don't forget to save.");
      } catch (e) {
        console.error('Profile image upload failed:', e);
        // Reset the flag since upload failed and nothing was changed
        setImageManuallyChanged(false);
        Alert.alert('Upload Failed', 'Could not upload image. Try again later.');
      }
    } catch (error) {
      console.error('Error in image picking process:', error);
      // Reset the flag in case it was set before the error
      setImageManuallyChanged(false);
      Alert.alert('Error', 'Failed to update profile picture');
    } finally {
      setLoading(false);
    }
  }, [currentUser, setLoading, setProfileImage, setImageManuallyChanged]);

  const saveSettingsAfterValidation = useCallback(async () => {
    try {
      setIsSaving(true);
      const sanitizedSettings = sanitizeSettings(settings);

      const oldImageUrl = userProfile?.profileImageUrl;
      const oldThumbnailUrl = userProfile?.profileThumbnailUrl;
      const newImageUrl = profileImage;
      const imageHasChanged = oldImageUrl && oldImageUrl !== newImageUrl;

      await createSettingsBackup(sanitizedSettings);

      const settingsToSave = {
        ...sanitizedSettings,
        dateOfBirth: sanitizedSettings.dateOfBirth
          ? sanitizedSettings.dateOfBirth.toISOString()
          : null,
        profileImageUrl: newImageUrl,
        profileThumbnailUrl: null,
        profileVisibility: sanitizedSettings.profileVisibility,
      };

      const firestoreUpdateData = {
        ...settingsToSave,
        lastModified: new Date(),
        version: 1,
      };

      await SettingsRepository.updateUser(currentUser!.uid, firestoreUpdateData);

      if (imageHasChanged) {
        try {
          if (oldImageUrl) {
            await deleteImageFromStorage(oldImageUrl);
          }
          if (oldThumbnailUrl && oldThumbnailUrl !== oldImageUrl) {
            try {
              await deleteImageFromStorage(oldThumbnailUrl);
            } catch (thumbError) {
              // Thumbnail deletion is optional
            }
          }
        } catch (deleteError) {
          console.error('[Settings] Non-critical error: Failed to delete old profile image.', deleteError);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      await refreshUserProfile();

      setOriginalSettings({ ...settings });
      setOriginalProfileImage(newImageUrl);
      setHasUnsavedChanges(false);
      setImageManuallyChanged(false);

      Alert.alert('Success', 'Settings updated successfully');
    } catch (error: any) {
      console.error('Error in saveSettingsAfterValidation:', error);
      Alert.alert('Error', 'Failed to update settings: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
      setIsSaving(false);
    }
  }, [settings, userProfile, profileImage, currentUser, refreshUserProfile, setIsSaving, setLoading, setOriginalSettings, setOriginalProfileImage, setHasUnsavedChanges, setImageManuallyChanged]);

  const handleSaveSettings = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const validation = validateSettings(settings);

      if (!validation.isValid) {
        Alert.alert(
          'Invalid Settings',
          'Please fix the following issues:\n' + validation.errors.join('\n'),
          [{ text: 'OK' }]
        );
        return;
      }

      if (validation.warnings.length > 0) {
        Alert.alert(
          'Warning',
          validation.warnings.join('\n'),
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
            { text: 'Continue', onPress: () => saveSettingsAfterValidation() },
          ]
        );
        return;
      }

      await saveSettingsAfterValidation();
    } catch (error: any) {
      console.error('Error updating settings:', error);
      const errorMessage =
        error?.code === 'unavailable'
          ? 'Service temporarily unavailable. Please try again.'
          : error?.code === 'permission-denied'
          ? "You don't have permission to update these settings."
          : 'Failed to update settings: ' + (error?.message || 'Unknown error');

      Alert.alert('Error', errorMessage);
      setLoading(false);
    }
  }, [currentUser, settings, setLoading, saveSettingsAfterValidation]);

  const handleExportSettings = useCallback(async () => {
    if (!currentUser || !userProfile) return;

    const success = await exportSettings(settings, currentUser.uid, userProfile.username);
    if (success) {
      Alert.alert('Success', 'Settings exported successfully!');
    }
  }, [currentUser, userProfile, settings]);

  const handleImportSettings = useCallback(async () => {
    const importedSettings = await importSettings();
    if (importedSettings) {
      Alert.alert('Import Settings', 'This will replace your current settings. Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: () => {
            setSettings(prev => ({ ...prev, ...importedSettings }));
            Alert.alert('Success', 'Settings imported successfully!');
          },
        },
      ]);
    }
  }, [setSettings]);

  const handleRestoreBackup = useCallback(async () => {
    const backup = await restoreSettingsBackup();
    if (backup) {
      Alert.alert('Restore Backup', 'This will restore your settings from the last backup. Continue?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: () => {
            setSettings(prev => ({ ...prev, ...backup }));
            Alert.alert('Success', 'Settings restored from backup!');
          },
        },
      ]);
    } else {
      Alert.alert('No Backup', 'No backup found to restore from.');
    }
  }, [setSettings]);

  const handleResetToDefaults = useCallback(async () => {
    Alert.alert('Reset to Defaults', 'This will reset all settings to their default values. This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          try {
            if (profileImage !== originalProfileImage && profileImage) {
              try {
                await deleteImageFromStorage(profileImage);
              } catch (deleteError) {
                console.error('Error deleting profile image:', deleteError);
              }
            }
          } finally {
            // Reset imageManuallyChanged first to allow useEffect to update profileImage
            setImageManuallyChanged(false);
            
            // Restore to original profile image
            const restoredImageUrl = originalProfileImage || userProfile?.profileImageUrl;
            setProfileImage(restoredImageUrl);
            
            setSettings({
              displayName: userProfile?.displayName || '',
              bio: '',
              archetype: '',
              profileVisibility: 'public',
              messagePermission: 'everyone',
              theme: 'dark',
              language: 'en',
              units: { weight: 'metric', distance: 'metric' },
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
            Alert.alert('Success', 'Settings reset to defaults!');
          }
        },
      },
    ]);
  }, [profileImage, originalProfileImage, userProfile, setProfileImage, setImageManuallyChanged, setSettings]);

  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);

      if (currentUser) {
        try {
          await NotificationService.removePushToken(currentUser.uid);
          await NotificationService.clearCachedTokens();
        } catch (tokenError) {
          console.error('Error cleaning up tokens (continuing with logout):', tokenError);
        }
      }

      await signOut(auth);

      await new Promise(resolve => setTimeout(resolve, 300));
      router.replace('/landing');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out completely, but you have been logged out.');
      router.replace('/landing');
    } finally {
      setLoading(false);
    }
  }, [currentUser, setLoading, router]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert('Delete Account', "This action cannot be undone. Type 'DELETE' to confirm account deletion.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        style: 'destructive',
        onPress: () => {
          Alert.prompt(
            'Confirm Deletion',
            "Type 'DELETE' to permanently delete your account:",
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete Account',
                style: 'destructive',
                onPress: async (text) => {
                  if (text === 'DELETE') {
                    try {
                      setLoading(true);
                      // Call Cloud Function to delete account
                      if (functions && functions.app) {
                        const deleteUserAccount = httpsCallable(functions, 'deleteUserAccount');
                        await deleteUserAccount();
                      }
                      Alert.alert('Success', 'Your account has been deleted');
                      router.replace('/landing');
                    } catch (error: any) {
                      console.error('Error deleting account:', error);
                      Alert.alert('Error', 'Failed to delete account: ' + (error?.message || 'Unknown error'));
                    } finally {
                      setLoading(false);
                    }
                  } else {
                    Alert.alert('Invalid Input', "You must type 'DELETE' exactly to confirm.");
                  }
                },
              },
            ],
            'plain-text'
          );
        },
      },
    ]);
  }, [router, setLoading]);

  const clearChatHistory = useCallback(async () => {
    try {
      setLoading(true);

      if (!functions || !functions.app) {
        Alert.alert('Error', 'Cloud functions not available. Please try again later.');
        return;
      }

      const clearUserData = httpsCallable(functions, 'clearUserData');
      await clearUserData({ dataType: 'chatHistory' });
      Alert.alert('Success', 'Chat history cleared successfully');
    } catch (error: any) {
      console.error('Error clearing chat history:', error);
      Alert.alert('Error', 'Failed to clear chat history: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  const clearSearchHistory = useCallback(async () => {
    try {
      setLoading(true);

      if (!functions || !functions.app) {
        Alert.alert('Error', 'Cloud functions not available. Please try again later.');
        return;
      }

      const clearUserData = httpsCallable(functions, 'clearUserData');
      await clearUserData({ dataType: 'searchHistory' });
      Alert.alert('Success', 'Search history cleared successfully');
    } catch (error: any) {
      console.error('Error clearing search history:', error);
      Alert.alert('Error', 'Failed to clear search history: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  const handleChangePassword = useCallback(() => {
    Alert.alert('Change Password', 'You will receive an email with instructions to reset your password.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send Email',
        onPress: async () => {
          try {
            const { sendPasswordResetEmail } = await import('firebase/auth');
            await sendPasswordResetEmail(auth, currentUser?.email || '');
            Alert.alert('Success', 'Password reset email sent! Check your inbox.');
          } catch (error) {
            console.error('Password reset error:', error);
            Alert.alert('Error', 'Failed to send password reset email. Please try again.');
          }
        },
      },
    ]);
  }, [currentUser]);

  return {
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
  };
}
