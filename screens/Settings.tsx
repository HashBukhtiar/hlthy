import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/firebaseConfig';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getOptimalImageUrl } from '@/utils/imageUtils';

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
  const { userProfile, currentUser, refreshUserProfile } = useAuth();
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
      
      // Refresh the profile data in context
      await refreshUserProfile();
      
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
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your photos to update your profile picture.');
        return;
      }
      
      // Open image picker with base64 support as fallback
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4, // Even lower quality
        base64: true, // Request base64 as fallback
      });
      
      if (result.canceled || !result.assets || !result.assets.length) {
        return;
      }
      
      setLoading(true);
      console.log("Image selected, preparing upload...");
      
      // Get image URI and base64
      const uri = result.assets[0].uri;
      const base64Data = result.assets[0].base64;
      
      // Create storage reference
      const storage = getStorage();
      const storageRef = ref(storage, `profileImages/${currentUser.uid}/${Date.now()}.jpg`);

      // Add metadata to trigger thumbnail generation
      const metadata = {
        customMetadata: {
          userId: currentUser.uid,
          type: 'profileImage'
        }
      };
      
      try {
        // First attempt with blob
        const response = await fetch(uri);
        const blob = await response.blob();
        
        console.log("Image size:", Math.round(blob.size/1024), "KB");
        
        if (blob.size > 5000000) { // 5MB limit check
          Alert.alert("Image too large", "Please select a smaller image or use lower quality");
          setLoading(false);
          return;
        }
        
        console.log("Attempting blob upload...");
        await uploadBytes(storageRef, blob, metadata); // Fixed: moved metadata here
        console.log("Upload successful!");
        
        // Get URL
        const downloadURL = await getDownloadURL(storageRef);
        console.log("Download URL retrieved:", downloadURL);
        
        // Update state
        setProfileImage(downloadURL);
        
        // Update user document in Firestore
        await updateDoc(doc(db, "users", currentUser.uid), {
          profileImageUrl: downloadURL,
          // The thumbnail URL will be added by the Cloud Function
        });
        
      } catch (blobError) {
        console.error("Blob upload failed:", blobError);
        
        // Try base64 fallback if available
        if (base64Data) {
          try {
            console.log("Trying base64 fallback...");
            
            // Create a temporary data URL to display while we handle server update
            const tempUrl = `data:image/jpeg;base64,${base64Data}`;
            setProfileImage(tempUrl);
            
            Alert.alert(
              "Image Preview Only",
              "Image upload to server failed, but we're showing a preview. Please try again later or contact support.",
              [{ text: "OK" }]
            );
          } catch (base64Error) {
            console.error("Base64 fallback failed:", base64Error);
            Alert.alert("Upload Failed", "Could not upload image. Please try again later.");
          }
        } else {
          Alert.alert("Upload Failed", "Please check your internet connection and try again.");
        }
      }
    } catch (error) {
      console.error("Error in image picking process:", error);
      Alert.alert("Error", "Failed to update profile picture");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Account Settings</Text>
      </View>
      
      <View style={styles.imageContainer}>
        <Image 
          source={{ 
            uri: getOptimalImageUrl(userProfile?.profileThumbnailUrl, userProfile?.profileImageUrl) || 
                'https://thumbs.dreamstime.com/b/creative-illustration-default-avatar-profile-placeholder-isolated-background-art-design-grey-photo-blank-template-mockup-144855718.jpg' 
          }} 
          style={styles.profileImage} 
        />
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