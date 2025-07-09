import { UserSettings } from '@/types/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKUP_KEY = 'hlthy_settings_backup';
const BACKUP_HISTORY_KEY = 'hlthy_settings_history';

export interface SettingsBackup {
  timestamp: string;
  settings: Partial<UserSettings>;
  version: string;
}

export const createSettingsBackup = async (settings: Partial<UserSettings>): Promise<void> => {
  try {
    const backup: SettingsBackup = {
      timestamp: new Date().toISOString(),
      settings,
      version: '1.0.0'
    };

    // Save current backup
    await AsyncStorage.setItem(BACKUP_KEY, JSON.stringify(backup));

    // Add to backup history (keep last 5)
    const historyStr = await AsyncStorage.getItem(BACKUP_HISTORY_KEY);
    const history: SettingsBackup[] = historyStr ? JSON.parse(historyStr) : [];
    
    history.unshift(backup);
    if (history.length > 5) {
      history.splice(5);
    }

    await AsyncStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to create settings backup:', error);
  }
};

export const restoreSettingsBackup = async (): Promise<Partial<UserSettings> | null> => {
  try {
    const backupStr = await AsyncStorage.getItem(BACKUP_KEY);
    if (!backupStr) return null;

    const backup: SettingsBackup = JSON.parse(backupStr);
    return backup.settings;
  } catch (error) {
    console.error('Failed to restore settings backup:', error);
    return null;
  }
};

export const getSettingsHistory = async (): Promise<SettingsBackup[]> => {
  try {
    const historyStr = await AsyncStorage.getItem(BACKUP_HISTORY_KEY);
    return historyStr ? JSON.parse(historyStr) : [];
  } catch (error) {
    console.error('Failed to get settings history:', error);
    return [];
  }
};

export const clearSettingsBackups = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(BACKUP_KEY);
    await AsyncStorage.removeItem(BACKUP_HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear settings backups:', error);
  }
};