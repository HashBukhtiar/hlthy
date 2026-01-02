import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth, Auth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_MEASUREMENT_ID,
};

console.log("Firebase initialization started");

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let analytics;
let storage: FirebaseStorage;

try {
  app = initializeApp(firebaseConfig);
  
  // Initialize Auth with persistence for React Native
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }
  
  db = getFirestore(app);
  storage = getStorage(app);
  
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
        console.log("Firebase analytics initialized");
      } else {
        console.log("Firebase analytics not supported in this environment");
      }
    })
    .catch(e => console.log("Analytics initialization error:", e));

  console.log("Firebase core services initialized (auth, db, storage)");

} catch (error) {
  console.error("Firebase initialization error:", error);
  throw error;
}

export { app, db, auth, storage, functions };