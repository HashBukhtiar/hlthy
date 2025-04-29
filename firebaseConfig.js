import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import {
  EXPO_PUBLIC_FIREBASE_API_KEY,
  EXPO_PUBLIC_AUTH_DOMAIN,
  EXPO_PUBLIC_PROJECT_ID,
  EXPO_PUBLIC_STORAGE_BUCKET,
  EXPO_PUBLIC_MESSAGING_SENDER_ID,
  EXPO_PUBLIC_APP_ID,
  EXPO_PUBLIC_MEASUREMENT_ID
} from '@env';

const firebaseConfig = {
  apiKey:             EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:         EXPO_PUBLIC_AUTH_DOMAIN,
  projectId:          EXPO_PUBLIC_PROJECT_ID,
  storageBucket:      EXPO_PUBLIC_STORAGE_BUCKET,
  messagingSenderId:  EXPO_PUBLIC_MESSAGING_SENDER_ID,
  appId:              EXPO_PUBLIC_APP_ID,
  measurementId:      EXPO_PUBLIC_MEASUREMENT_ID,
};

let app, auth, db, analytics;

try {
  // 1) Initialize core app
  app = initializeApp(firebaseConfig);

  // 2) Auth + persistence for RN
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });

  // 3) Firestore
  db = getFirestore(app);

  // 4) (Optional) Analytics if supported
  isSupported()
    .then(supported => {
      if (supported) analytics = getAnalytics(app);
    })
    .catch(e => console.log("Analytics error:", e));

  console.log("Firebase initialized");
} catch (error) {
  console.error("Firebase initialization error:", error);
}

export { auth, db };