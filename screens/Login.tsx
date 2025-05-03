import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  Image, 
  KeyboardAvoidingView, 
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '@/firebaseConfig';
import { useRouter } from 'expo-router';

export default function Login() {
  const router = useRouter();
  
  const [emailAddress, setEmailAddress] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isEmailValid, setIsEmailValid] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
  // Check if the email is valid
  const isValidEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleLogin = async () => {
    try {
      // Clear previous errors
      setErrorMessage("");
      
      // Validate form data
      if (!isValidEmail(emailAddress)) {
        setErrorMessage("Please provide a valid email.");
        return;
      }
      
      if (!password) {
        setErrorMessage("Please enter your password.");
        return;
      }
      
      // Show loading indicator
      setLoading(true);
      
      // Sign in with Firebase Authentication
      await signInWithEmailAndPassword(auth, emailAddress, password);
      
      // Navigate to root where index.tsx will handle the redirect
      router.replace('/');
      
    } catch (error: any) {
      // Handle specific Firebase errors
      let errorMsg = "An error occurred during login, ensure your email and password.";
      
      console.log("Error code:", error.code);
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMsg = "Invalid email or password.";
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = "Please enter a valid email address.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMsg = "Too many failed login attempts. Please try again later.";
      } else if (error.code === 'auth/user-disabled') {
        errorMsg = "This account has been disabled.";
      }
      
      console.error("Login error:", error);
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image
              style={styles.logo}
              source={require('@/assets/images/logo-dark.png')}
            />
          </View>
          
          <View style={styles.contentContainer}>
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.loadingText}>Logging in...</Text>
              </View>
            )}
            <Text style={[styles.header, {fontWeight: 'bold'}]}>Login</Text>
            
            <TextInput
              label="Email Address"
              value={emailAddress}
              onChangeText={setEmailAddress}
              onBlur={() => setIsEmailValid(isValidEmail(emailAddress))}
              style={styles.input}
              mode="outlined"
              theme={{ colors: { primary: 'white', text: 'white', underlineColor:'transparent', background: '#222222'}}}
              autoCapitalize='none'
              keyboardType="email-address"
              textColor='white'
              error={!isEmailValid}
            />
            
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              mode="outlined"
              theme={{ colors: { primary: 'white', text: 'white', underlineColor:'transparent', background: '#222222'}}}
              textColor='white'
            />
            
            <Button 
              mode="contained" 
              onPress={handleLogin}
              style={[styles.button, { backgroundColor: '#FFFFFF' }]} 
              labelStyle={{ color: '#000' }}>
              Log In
            </Button>
            
            <Text style={{ color: '#FF5555', textAlign: 'center', marginTop: 15, marginBottom: 10 }}>{errorMessage}</Text>
            
            <Button 
              mode="text" 
              onPress={() => router.push('/signup')}
              style={[styles.button]} 
              labelStyle={{ color: '#FFFFFF' }}>
              Don't have an account? Sign Up
            </Button>
            
            <Button 
              mode="text" 
              onPress={() => router.push('/forgot-password')}
              style={[styles.button]} 
              labelStyle={{ color: '#AAAAAA' }}>
              Forgot Password?
            </Button>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  logoContainer: {
    paddingTop: 20,
    alignItems: 'center',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    fontSize: 24,
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 30
  },
  input: {
    marginBottom: 16,
    color: 'white',
  },
  button: {
    marginTop: 16,
  },
  logo: {
    width: 50,
    height: 50,
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
  }
});