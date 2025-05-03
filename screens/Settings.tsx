import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import globalStyles from '@/styles/globalStyles';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/firebaseConfig';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface DropdownItem {
  label: string;
  value: string;
}

const unitsData: DropdownItem[] = [
  { label: 'Metric (kg)', value: 'metric' },
  { label: 'Imperial (lbs)', value: 'imperial' },
];

const accountPrivacyData: DropdownItem[] = [
  { label: 'Public', value: 'public' },
  { label: 'Private', value: 'private' },
];

const languageData: DropdownItem[] = [
  { label: 'English', value: 'en' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Italian', value: 'it' },
  { label: 'Dutch', value: 'nl' },
];

const regionData: DropdownItem[] = [
  { label: 'Canada', value: 'ca' },
  { label: 'United States', value: 'us' },
  { label: 'United Kingdom', value: 'uk' },
  { label: 'Australia', value: 'au' },
  { label: 'Germany', value: 'de' },
  { label: 'France', value: 'fr' },
  { label: 'Italy', value: 'it' },
  { label: 'Spain', value: 'es' },
  { label: 'Netherlands', value: 'nl' },
  { label: 'Mexico', value: 'mx' },
  { label: 'Brazil', value: 'br' },
  { label: 'Japan', value: 'jp' },
  { label: 'China', value: 'cn' },
  { label: 'India', value: 'in' },
  { label: 'South Korea', value: 'kr' },
  { label: 'Russia', value: 'ru' },
  { label: 'South Africa', value: 'za' },
  { label: 'Saudi Arabia', value: 'sa' },
  { label: 'United Arab Emirates', value: 'ae' },
  { label: 'Qatar', value: 'qa' },
  { label: 'Turkey', value: 'tr' },
];

export default function Settings() {
  /*
  // Profile
  const [name, setName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [bio, setBio] = useState<string>('');

  // General
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [locationEnabled, setLocationEnabled] = useState<boolean>(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState<boolean>(true);
  const [units, setUnits] = useState<string>('metric');

  // Privacy and Security
  const [accountPrivacy, setAccountPrivacy] = useState<string>('public');
  
  // Misc Settings
  const [language, setLanguage] = useState<string>('en');
  const [region, setRegion] = useState<string>('ca');

  const saveSettings = () => {
    console.log('Settings saved:', {
      name,
      username,
      bio,
      notificationsEnabled,
      locationEnabled,
      darkModeEnabled,
      units,
      accountPrivacy,
      language,
      region,
    });
  };

  return (
    <View style={[globalStyles.container, styles.container]}>
      <Text style={styles.header}>Settings</Text>

      <ScrollView style={styles.card} keyboardShouldPersistTaps="handled">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View>
            <Text style={styles.subheader}>Profile</Text>
            <View style={styles.itemRow}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                onChangeText={setName}
                value={name}
                placeholder="Enter your name"
                placeholderTextColor="#ccc"
                returnKeyType="done"
              />
            </View>

            <View style={styles.itemRow}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                onChangeText={setUsername}
                value={username}
                placeholder="Enter your username"
                placeholderTextColor="#ccc"
                returnKeyType="done"
              />
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.label}>Biography</Text>
              <TextInput
                style={styles.longInput}
                onChangeText={setBio}
                value={bio}
                placeholder="Enter your biography"
                placeholderTextColor="#ccc"
                multiline={true}
                textAlignVertical="top"
                returnKeyType="done"
              />
            </View>

            <Text style={styles.subheader}>General</Text>
            <View style={styles.itemRow}>
              <Text style={styles.label}>Notifications</Text>
              <Switch
                onValueChange={setNotificationsEnabled}
                value={notificationsEnabled}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={notificationsEnabled ? '#f5dd4b' : '#f4f3f4'}
              />
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.label}>Location</Text>
              <Switch
                onValueChange={setLocationEnabled}
                value={locationEnabled}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={locationEnabled ? '#f5dd4b' : '#f4f3f4'}
              />
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.label}>Language</Text>
              <Dropdown
                data={languageData}
                labelField="label"
                valueField="value"
                value={language}
                onChange={item => setLanguage(item.value)}
                style={styles.dropdown}
                placeholder="English"
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
              />
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.label}>Region</Text>
              <Dropdown
                data={regionData}
                labelField="label"
                valueField="value"
                value={region}
                onChange={item => setRegion(item.value)}
                style={styles.dropdown}
                placeholder="Canada"
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
              />
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.label}>Measurement Units</Text>
              <Dropdown
                data={unitsData}
                labelField="label"
                valueField="value"
                value={units}
                onChange={item => setUnits(item.value)}
                style={styles.dropdown}
                placeholder="Select Units"
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
              />
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.label}>Dark Mode</Text>
              <Switch
                onValueChange={setDarkModeEnabled}
                value={darkModeEnabled}
              />
            </View>

            <Text style={styles.subheader}>Privacy and Security</Text>
            <View style={styles.itemRow}>
              <Text style={styles.label}>Profile Visibility</Text>
              <Dropdown
                data={accountPrivacyData}
                labelField="label"
                valueField="value"
                value={accountPrivacy}
                onChange={item => setAccountPrivacy(item.value)}
                style={styles.dropdown}
                placeholder="Public"
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
              />
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.label}>Blocked Users</Text>
              <TouchableOpacity style={styles.button} onPress={() => console.log('View Blocked Users pressed')}>
                <Text style={styles.label}>Manage Blocked Users</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.label}>Two-Factor Authentication</Text>
              <TouchableOpacity style={styles.button} onPress={() => console.log('2FA Setup pressed')}>
                <Text style={styles.label}>2FA Setup</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.label}>Active Devices</Text>
              <TouchableOpacity style={styles.button} onPress={() => console.log('View Active Devices pressed')}>
                <Text style={styles.label}>View Active Devices</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.subheader}>Subscription Settings</Text>
            <View style={styles.itemRow}>
              <Text style={styles.label}>hlthy Plan</Text>
              <TouchableOpacity style={styles.button} onPress={() => console.log('Manage hlthy Subscription pressed')}>
                <Text style={styles.label}>Manage Subscription</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.label}>Payment</Text>
              <TouchableOpacity style={styles.button} onPress={() => console.log('Manage Payment Methods pressed')}>
                <Text style={styles.label}>Manage Payment Methods</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.subheader}>Miscellaneous</Text>
            <View style={styles.itemRow}>
              <Text style={styles.label}>FAQs</Text>
              <TouchableOpacity style={styles.button} onPress={() => console.log('View FAQs pressed')}>
                <Text style={styles.label}>View FAQs</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.label}>Feedback</Text>
              <TouchableOpacity style={styles.button} onPress={() => console.log('Provide Feedback/ Report Bugs pressed')}>
                <Text style={styles.label}>Provide Feedback/ Report Bugs</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.label}>Support</Text>
              <TouchableOpacity style={styles.button} onPress={() => console.log('Contact Customer Support pressed')}>
                <Text style={styles.label}>Contact Customer Support</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>

      <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
        <Text style={styles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>
    </View>
  );
  */

  const { userProfile, currentUser } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [profileImage, setProfileImage] = useState(userProfile?.profileImageUrl);
  const [loading, setLoading] = useState(false);
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Update user document in Firestore
      await updateDoc(doc(db, "users", currentUser.uid), {
        displayName,
        bio,
        ...(profileImage !== userProfile?.profileImageUrl && { profileImageUrl: profileImage })
      });
      
      Alert.alert("Success", "Profile updated successfully");
      router.back();
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    // Request permission to access media library
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your photos to update your profile picture.');
      return;
    }
    
    try {
      // Open image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoading(true);
        
        // Get the selected image URI
        const uri = result.assets[0].uri;
        
        // Create reference to storage
        const storage = getStorage();
        const filename = `profile-${currentUser.uid}-${Date.now()}`;
        const storageRef = ref(storage, `profileImages/${filename}`);
        
        // Convert image to blob
        const response = await fetch(uri);
        const blob = await response.blob();
        
        // Upload to Firebase Storage
        await uploadBytes(storageRef, blob);
        
        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);
        
        // Update state with new image URL
        setProfileImage(downloadURL);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to update profile picture");
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Account Settings</Text>
      </View>
      
      <View style={styles.imageContainer}>
        <Image source={{ uri: profileImage || 'https://thumbs.dreamstime.com/b/creative-illustration-default-avatar-profile-placeholder-isolated-background-art-design-grey-photo-blank-template-mockup-144855718.jpg' }} 
               style={styles.profileImage} />
        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
          <Text style={styles.imageButtonText}>Change Photo</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Display Name"
          placeholderTextColor="#666"
        />
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell us about yourself"
          placeholderTextColor="#666"
          multiline
        />
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Username</Text>
        <Text style={styles.staticText}>{userProfile?.username}</Text>
        <Text style={styles.helperText}>Username cannot be changed</Text>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.staticText}>{currentUser?.email}</Text>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Archetype</Text>
        <Text style={styles.staticText}>{userProfile?.archetype || 'Not set'}</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.updateButton} 
        onPress={handleUpdateProfile}
        disabled={loading}>
        <Text style={styles.updateButtonText}>
          {loading ? 'Updating...' : 'Update Profile'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );


}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    padding: 20,
  },
  header: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  subheader: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 10,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
  },
  imageButton: {
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 10,
  },
  imageButtonText: {
    color: 'white',
    fontSize: 14,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    backgroundColor: '#222',
    color: 'white',
    padding: 12,
    fontSize: 16,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
    marginTop: 4,
  },
  staticText: {
    color: '#ccc',
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#222',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  helperText: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  updateButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  updateButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 50,
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  longInput: {
    flex: 2,
    height: 100,
    borderColor: '#555',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: '#333',
    textAlignVertical: 'top',
  },
  dropdown: {
    flex: 1,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#333',
  },
  button: {
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
    alignItems: 'center',
    marginTop: 'auto',
  },
  placeholderStyle: {
    color: '#ccc',
  },
  selectedTextStyle: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#2196f3',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});