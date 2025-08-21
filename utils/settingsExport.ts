import { UserSettings } from '@/types/settings';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

export interface SettingsExport {
  exportedAt: string;
  appVersion: string;
  settings: Partial<UserSettings>;
  metadata: {
    userId: string;
    username: string;
    exportVersion: string;
  };
}

export const exportSettings = async (
  settings: Partial<UserSettings>, 
  userId: string, 
  username: string
): Promise<boolean> => {
  try {
    const exportData: SettingsExport = {
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      settings,
      metadata: {
        userId,
        username,
        exportVersion: '1.0'
      }
    };

    const filename = `hlthy_settings_${username}_${Date.now()}.json`;
    const fileUri = FileSystem.documentDirectory + filename;

    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify(exportData, null, 2),
      { encoding: FileSystem.EncodingType.UTF8 }
    );

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export Settings'
      });
    }

    return true;
  } catch (error) {
    console.error('Export settings failed:', error);
    Alert.alert('Export Failed', 'Failed to export settings. Please try again.');
    return false;
  }
};

export const importSettings = async (): Promise<Partial<UserSettings> | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true
    });

    if (result.canceled) {
      return null;
    }

    const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
    const importData: SettingsExport = JSON.parse(fileContent);

    // Validate import data structure
    if (!importData.settings || !importData.metadata) {
      throw new Error('Invalid settings file format');
    }

    // Remove sensitive/non-transferable settings using destructuring
    const { 
      dateOfBirth,      // Personal data - don't import across devices
      blockedUsers,     // Security data - should be device/account specific  
      email,            // Account data - tied to specific user account
      twoFactorEnabled, // Security setting - should not be transferred
      ...sanitizedSettings 
    } = importData.settings;

    return sanitizedSettings;
  } catch (error) {
    console.error('Import settings failed:', error);
    Alert.alert('Import Failed', 'Invalid settings file or format. Please check your file and try again.');
    return null;
  }
};