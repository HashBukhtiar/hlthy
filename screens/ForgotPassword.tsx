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
  ActivityIndicator,
  Alert
} from 'react-native';
import { Button, TextInput, RadioButton } from 'react-native-paper';
import { useRouter } from 'expo-router';

export default function ForgotPassword() {
  const router = useRouter();
  
  const [emailAddress, setEmailAddress] = useState<string>('');
  const [resetMethod, setResetMethod] = useState<string>('email-code'); // 'email-code' or 'reset-link'
  const [isEmailValid, setIsEmailValid] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  // Check if the email is valid
  const isValidEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async () => {
    try {
      // Clear previous errors
      setErrorMessage("");
      
      // Validate form data
      if (!isValidEmail(emailAddress)) {
        setErrorMessage("Please provide a valid email address.");
        return;
      }
      
      // Show loading indicator
      setLoading(true);
      
      // Simulate API call delay (replace with actual API call in functionality implementation)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Set submitted state to show success message
      setSubmitted(true);
      
    } catch (error: any) {
      console.error("Forgot password error:", error);
      setErrorMessage("An error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/login');
  };

  if (submitted) {
    return (
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
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
            <Text style={[styles.header, {fontWeight: 'bold'}]}>Check Your Email</Text>
            
            <View style={styles.successContainer}>
              <Text style={styles.successMessage}>
                {resetMethod === 'email-code' 
                  ? `We've sent a one-time verification code to ${emailAddress}`
                  : `We've sent a password reset link to ${emailAddress}`
                }
              </Text>
              
              <Text style={styles.instructionText}>
                {resetMethod === 'email-code' 
                  ? 'Enter the verification code in the login page to access your account.'
                  : 'Click the link in your email to reset your password, then return to login.'
                }
              </Text>
              
              <Text style={styles.noteText}>
                You'll need to use your password to login after verification.
              </Text>
            </View>
            
            <Button 
              mode="contained" 
              onPress={handleBackToLogin}
              style={[styles.button, { backgroundColor: '#FFFFFF' }]} 
              labelStyle={{ color: '#000' }}>
              Back to Login
            </Button>
            
            <Button 
              mode="text" 
              onPress={() => setSubmitted(false)}
              style={styles.button} 
              labelStyle={{ color: '#AAAAAA' }}>
              Try Different Email
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
                <Text style={styles.loadingText}>Sending request...</Text>
              </View>
            )}
            
            <Text style={[styles.header, {fontWeight: 'bold'}]}>Forgot Password</Text>
            
            <Text style={styles.subHeader}>
              Choose how you'd like to recover your account:
            </Text>
            
            {/* Reset Method Selection */}
            <View style={styles.radioContainer}>
              <View style={styles.radioOption}>
                <RadioButton
                  value="email-code"
                  status={resetMethod === 'email-code' ? 'checked' : 'unchecked'}
                  onPress={() => setResetMethod('email-code')}
                  color="#FFFFFF"
                />
                <View style={styles.radioTextContainer}>
                  <Text style={styles.radioTitle}>One-time Email Code</Text>
                  <Text style={styles.radioDescription}>
                    Receive a verification code to login temporarily
                  </Text>
                </View>
              </View>
              
              <View style={styles.radioOption}>
                <RadioButton
                  value="reset-link"
                  status={resetMethod === 'reset-link' ? 'checked' : 'unchecked'}
                  onPress={() => setResetMethod('reset-link')}
                  color="#FFFFFF"
                />
                <View style={styles.radioTextContainer}>
                  <Text style={styles.radioTitle}>Password Reset Link</Text>
                  <Text style={styles.radioDescription}>
                    Receive a link to create a new password
                  </Text>
                </View>
              </View>
            </View>
            
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
            
            <Button 
              mode="contained" 
              onPress={handleSubmit}
              style={[styles.button, { backgroundColor: '#FFFFFF' }]} 
              labelStyle={{ color: '#000' }}
              disabled={loading || !emailAddress || !isEmailValid}>
              {resetMethod === 'email-code' ? 'Send Verification Code' : 'Send Reset Link'}
            </Button>
            
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}
            
            <Button 
              mode="text" 
              onPress={() => router.push('/login')}
              style={styles.button} 
              labelStyle={{ color: '#AAAAAA' }}>
              Back to Login
            </Button>
            
            <Button 
              mode="text" 
              onPress={() => router.push('/signup')}
              style={styles.button} 
              labelStyle={{ color: '#AAAAAA' }}>
              Don't have an account? Sign Up
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
  subHeader: {
    fontSize: 16,
    color: '#AAAAAA',
    marginBottom: 20,
    textAlign: 'center',
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
  },
  radioContainer: {
    marginBottom: 20,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingVertical: 10,
  },
  radioTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  radioTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  radioDescription: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 18,
  },
  errorText: {
    color: '#FF5555',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 10
  },
  successContainer: {
    backgroundColor: '#222222',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  successMessage: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 22,
  },
  instructionText: {
    color: '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  noteText: {
    color: '#FFAA00',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
