import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { 
  REACT_APP_API_KEY, 
  REACT_APP_AUTH_DOMAIN, 
  REACT_APP_PROJECT_ID, 
  REACT_APP_STORAGE_BUCKET, 
  REACT_APP_MESSAGING_SENDER_ID, 
  REACT_APP_APP_ID, 
  REACT_APP_MEASUREMENT_ID 
} from '@env';

// Initialize Firebase
const firebaseConfig = {
    apiKey: REACT_APP_API_KEY,
    authDomain: REACT_APP_AUTH_DOMAIN,
    projectId: REACT_APP_PROJECT_ID,
    storageBucket: REACT_APP_STORAGE_BUCKET,
    messagingSenderId: REACT_APP_MESSAGING_SENDER_ID,
    appId: REACT_APP_APP_ID,
    measurementId: REACT_APP_MEASUREMENT_ID,
};

console.log("App Launched");

let app;
let auth;
let db;
let analytics;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Set persistence separately if needed
  // import { setPersistence, inMemoryPersistence } from "firebase/auth";
  // setPersistence(auth, inMemoryPersistence);
  
  db = getFirestore(app);
  
  // Analytics setup
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(e => console.log("Analytics error:", e));

} catch (error) {
  console.error("Firebase initialization error:", error);
}

export { db, auth };