import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/firebaseConfig';
import { signOut, sendPasswordResetEmail } from 'firebase/auth';
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
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [weightUnitModalVisible, setWeightUnitModalVisible] = useState(false);
  const [distanceUnitModalVisible, setDistanceUnitModalVisible] = useState(false);

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
                    onPress: () => Alert.alert("Coming Soon", "Chat history clearing will be available in a future update.")
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
                    onPress: () => Alert.alert("Coming Soon", "Search history clearing will be available in a future update.")
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