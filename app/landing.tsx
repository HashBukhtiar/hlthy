import React from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  Image, 
  TouchableOpacity,
  Dimensions,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function Landing() {
  const router = useRouter();
  const { width } = Dimensions.get('window');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#000000', '#1a1a1a']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              style={styles.logo}
              source={require('@/assets/images/logo-dark.png')}
            />
            <Text style={styles.appName}>HLTHY</Text>
          </View>

          <View style={styles.taglineContainer}>
            <Text style={styles.tagline}>Your Personal Health Journey</Text>
            <Text style={styles.subtagline}>Start your path to better health today</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.signUpButton]}
              onPress={() => router.push('/signup')}
            >
              <Text style={styles.buttonText}>Sign Up</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.loginButton]}
              onPress={() => router.push('/login')}
            >
              <Text style={[styles.buttonText, styles.loginButtonText]}>Login</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Text style={styles.featureTitle}>Track Progress</Text>
              <Text style={styles.featureDescription}>Monitor your health journey with detailed analytics</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureTitle}>Personalized Plans</Text>
              <Text style={styles.featureDescription}>Get customized health recommendations</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureTitle}>Community Support</Text>
              <Text style={styles.featureDescription}>Connect with others on similar health journeys</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  taglineContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  tagline: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtagline: {
    fontSize: 16,
    color: '#AAAAAA',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 40,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  signUpButton: {
    backgroundColor: '#FFFFFF',
  },
  loginButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  loginButtonText: {
    color: '#FFFFFF',
  },
  featuresContainer: {
    marginTop: 40,
    marginBottom: 40,
  },
  featureItem: {
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  featureDescription: {
    fontSize: 14,
    color: '#AAAAAA',
    lineHeight: 20,
  },
}); 