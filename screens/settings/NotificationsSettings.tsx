import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { SettingsRepository } from '@/features/settings/infra/settingsRepository';

interface NotificationState {
  newFollowers: boolean;
  likesAndComments: boolean;
  directMessages: boolean;
  followRequestAccepted: boolean;
  taggedInComments: boolean;
  mentionedInReplies: boolean;
}

export default function NotificationsSettings() {
  const router = useRouter();
  const { userProfile, currentUser, refreshUserProfile } = useAuth();
  const [saving, setSaving] = useState<string | null>(null);

  const notifications: NotificationState = {
    newFollowers: userProfile?.notifications?.newFollowers ?? true,
    likesAndComments: userProfile?.notifications?.likesAndComments ?? true,
    directMessages: userProfile?.notifications?.directMessages ?? true,
    followRequestAccepted: userProfile?.notifications?.followRequestAccepted ?? true,
    taggedInComments: userProfile?.notifications?.taggedInComments ?? true,
    mentionedInReplies: userProfile?.notifications?.mentionedInReplies ?? true,
  };

  const handleToggle = useCallback(async (key: keyof NotificationState, value: boolean) => {
    if (!currentUser) return;
    setSaving(key);
    try {
      const updated = { ...notifications, [key]: value };
      await SettingsRepository.updateUser(currentUser.uid, { notifications: updated });
      await refreshUserProfile();
    } catch (error) {
      console.error('Failed to save notification setting:', error);
    } finally {
      setSaving(null);
    }
  }, [currentUser, notifications, refreshUserProfile]);

  const renderRow = (
    key: keyof NotificationState,
    label: string,
    isLast = false,
  ) => (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      {saving === key ? (
        <ActivityIndicator size="small" color="#FF2D55" />
      ) : (
        <Switch
          value={notifications[key]}
          onValueChange={(v) => handleToggle(key, v)}
          trackColor={{ false: '#3A3A3C', true: '#FF2D55' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#3A3A3C"
        />
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <Text style={styles.sectionHeader}>ACTIVITY</Text>
      <View style={styles.card}>
        {renderRow('newFollowers', 'New Followers')}
        {renderRow('likesAndComments', 'Likes and Comments')}
        {renderRow('directMessages', 'Direct Messages', true)}
      </View>

      <Text style={styles.sectionHeader}>SOCIAL</Text>
      <View style={styles.card}>
        {renderRow('followRequestAccepted', 'Follow Request Accepted')}
        {renderRow('taggedInComments', 'Tagged in Comments')}
        {renderRow('mentionedInReplies', 'Mentioned in Replies', true)}
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
    paddingBottom: 20,
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  rowLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  footer: {
    height: 40,
  },
});
