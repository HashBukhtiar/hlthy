import { initializeApp, setLogLevel } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

// Initialize Firebase
let app;
let auth: Auth;
let db: Firestore;
let analytics;
let storage; // Add storage variable

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  
  // Analytics setup - only supported in certain environments
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

  console.log("Firebase storage initialized");

} catch (error) {
  console.error("Firebase initialization error:", error);
  console.log(firebaseConfig);
}

export { db, auth, storage };