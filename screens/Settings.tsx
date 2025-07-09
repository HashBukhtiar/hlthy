import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/firebaseConfig';
import { signOut } from 'firebase/auth';
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

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Italian', value: 'it' },
  { label: 'Dutch', value: 'nl' },
];

const themeOptions = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
];

const privacyOptions = [
  { label: 'Public', value: 'public' },
  { label: 'Followers Only', value: 'followers' },
  { label: 'Private', value: 'private' },
];

const permissionOptions = [
  { label: 'Everyone', value: 'everyone' },
  { label: 'Followers Only', value: 'followers' },
];

const followOptions = [
  { label: 'Anyone', value: 'anyone' },
  { label: 'Approval Required', value: 'approval' },
];

export default function Settings() {
  const { userProfile, currentUser, refreshUserProfile } = useAuth();
  const router = useRouter();
  
  // Settings state
  const [settings, setSettings] = useState<Partial<UserSettings>>({
    displayName: userProfile?.displayName || '',
    bio: userProfile?.bio || '',
    archetype: userProfile?.archetype || '',
    profileVisibility: userProfile?.profileVisibility || 'public',
    followPermission: userProfile?.followPermission || 'anyone',
    commentPermission: userProfile?.commentPermission || 'everyone',
    messagePermission: userProfile?.messagePermission || 'everyone',
    theme: userProfile?.theme || 'dark',
    language: userProfile?.language || 'en',
    units: {
      weight: userProfile?.units?.weight || 'metric',
      distance: userProfile?.units?.distance || 'metric',
    },
    notifications: {
      newFollowers: userProfile?.notifications?.newFollowers ?? true,
      likesAndComments: userProfile?.notifications?.likesAndComments ?? true,
      directMessages: userProfile?.notifications?.directMessages ?? true,
      followRequestAccepted: userProfile?.notifications?.followRequestAccepted ?? true,
      taggedInComments: userProfile?.notifications?.taggedInComments ?? true,
      mentionedInReplies: userProfile?.notifications?.mentionedInReplies ?? true,
    },
    twoFactorEnabled: userProfile?.twoFactorEnabled || false,
    dateOfBirth: userProfile?.dateOfBirth ? new Date(userProfile.dateOfBirth) : undefined,
  });

  // UI state
  const [sections, setSections] = useState<SettingsSectionType[]>([
    { id: 'profile', title: 'Profile Information', icon: 'person-circle', expanded: true },
    { id: 'account', title: 'Account & Security', icon: 'shield-checkmark', expanded: false },
    { id: 'privacy', title: 'Privacy & Visibility', icon: 'eye', expanded: false },
    { id: 'notifications', title: 'Notifications', icon: 'notifications', expanded: false },
    { id: 'preferences', title: 'UI/UX Preferences', icon: 'settings', expanded: false },
    { id: 'misc', title: 'Miscellaneous', icon: 'ellipsis-horizontal', expanded: false },
  ]);

  const [profileImage, setProfileImage] = useState(userProfile?.profileImageUrl);
  const [archetypeModalVisible, setArchetypeModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Update settings when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setSettings(prev => ({
        ...prev,
        displayName: userProfile.displayName || '',
        bio: userProfile.bio || '',
        archetype: userProfile.archetype || '',
        // Add other fields as they become available in userProfile
      }));
      setProfileImage(userProfile.profileImageUrl);
    }
  }, [userProfile]);

  const toggleSection = (sectionId: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, expanded: !section.expanded }
        : section
    ));
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => {
      if (key.includes('.')) {
        // Handle nested keys like 'notifications.newFollowers'
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
      
      // Update user document in Firestore with all settings
      await updateDoc(doc(db, "users", currentUser.uid), {
        ...settings,
        ...(profileImage !== userProfile?.profileImageUrl && { profileImageUrl: profileImage }),
        lastModified: new Date(),
      });
      
      await refreshUserProfile();
      
      Alert.alert("Success", "Settings updated successfully");
    } catch (error) {
      console.error("Error updating settings:", error);
      Alert.alert("Error", "Failed to update settings");
    } finally {
      setLoading(false);
    }
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
      "This action cannot be undone. Are you sure you want to delete your account?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            // TODO: Implement account deletion
            Alert.alert("Coming Soon", "Account deletion will be available in a future update.");
          }
        }
      ]
    );
  };

  const handleChangePassword = () => {
    // TODO: Implement password change
    Alert.alert("Coming Soon", "Password change will be available in a future update.");
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      updateSetting('dateOfBirth', selectedDate);
    }
  };

  console.log('archetypeModalVisible:', archetypeModalVisible);

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
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
            type="date"
            label="Date of Birth"
            value={settings.dateOfBirth}
            onPress={() => setShowDatePicker(true)}
            placeholder="Select your birth date"
            helperText="Used for age-based recommendations"
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
            onPress={() => {/* TODO: Show modal */}}
          />

          <SettingsItem
            type="select"
            label="Who Can Follow You"
            value={settings.followPermission}
            options={followOptions}
            onPress={() => {/* TODO: Show modal */}}
          />

          <SettingsItem
            type="select"
            label="Who Can Comment"
            value={settings.commentPermission}
            options={permissionOptions}
            onPress={() => {/* TODO: Show modal */}}
          />

          <SettingsItem
            type="select"
            label="Who Can Message You"
            value={settings.messagePermission}
            options={permissionOptions}
            onPress={() => {/* TODO: Show modal */}}
          />

          <SettingsItem
            type="button"
            label="Blocked Users"
            onPress={() => {/* TODO: Navigate to blocked users */}}
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
            onPress={() => {/* TODO: Show modal */}}
          />

          <SettingsItem
            type="select"
            label="Language"
            value={settings.language}
            options={languageOptions}
            onPress={() => {/* TODO: Show modal */}}
          />

          <SettingsItem
            type="select"
            label="Weight Unit"
            value={settings.units?.weight}
            options={[
              { label: 'Metric (kg)', value: 'metric' },
              { label: 'Imperial (lbs)', value: 'imperial' }
            ]}
            onPress={() => {/* TODO: Show modal */}}
          />

          <SettingsItem
            type="select"
            label="Distance Unit"
            value={settings.units?.distance}
            options={[
              { label: 'Metric (km)', value: 'metric' },
              { label: 'Imperial (mi)', value: 'imperial' }
            ]}
            onPress={() => {/* TODO: Show modal */}}
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
            onPress={() => {/* TODO: Clear chat history */}}
          />

          <SettingsItem
            type="button"
            label="Clear Search History"
            onPress={() => {/* TODO: Clear search history */}}
          />

          <SettingsItem
            type="info"
            label="App Version"
            value="1.0.0"
          />

          <SettingsItem
            type="button"
            label="Privacy Policy"
            onPress={() => {/* TODO: Open privacy policy */}}
          />

          <SettingsItem
            type="button"
            label="Terms of Service"
            onPress={() => {/* TODO: Open terms */}}
          />
        </SettingsSection>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSaveSettings}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={settings.dateOfBirth || new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
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
});