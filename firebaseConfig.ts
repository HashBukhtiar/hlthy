import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';
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
let functions;

try {
  // Check if Firebase app is already initialized (handles HMR)
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log("Firebase app initialized");
  } else {
    app = getApp();
    console.log("Firebase app already initialized, reusing existing instance");
  }
  
  // Initialize Auth with persistence for React Native
  // Use getAuth which returns existing instance if already initialized
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    // For React Native, try getAuth first (returns existing instance)
    // Only use initializeAuth on first initialization
    try {
      auth = getAuth(app);
    } catch {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
    }
  }
  
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app, 'northamerica-northeast2');
  
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