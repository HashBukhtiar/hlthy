import * as admin from "firebase-admin";
import {getFirestore} from "firebase-admin/firestore";
import {getAuth as getAdminAuth} from "firebase-admin/auth";

// Initialize Firebase Admin SDK only if it hasn't been initialized yet.
if (admin.apps.length === 0) {
  admin.initializeApp();
  console.log("firebaseAdmin.ts: Firebase Admin SDK initialized.");
} else {
  console.log("firebaseAdmin.ts: Firebase Admin SDK already initialized.");
}

let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

export function initializeDbAndAuth() {
  // This function can now primarily be for logging or specific setup
  // if the core initialization is handled above.
  // Or, it can ensure db and auth are set.
  if (!db) {
    db = getFirestore();
    console.log("firebaseAdmin.ts: Firestore instance obtained in initializeDbAndAuth.");
  }
  if (!auth) {
    auth = getAdminAuth();
    console.log("firebaseAdmin.ts: Auth instance obtained in initializeDbAndAuth.");
  }
}

export function getDb(): admin.firestore.Firestore {
  if (!db) {
    // Fallback initialization if not already done
    console.warn("firebaseAdmin.ts: Firestore instance was not pre-initialized. Initializing now in getDb().");
    db = getFirestore();
  }
  return db;
}

export function getAuth(): admin.auth.Auth {
  if (!auth) {
    // Fallback initialization if not already done
    console.warn("firebaseAdmin.ts: Auth instance was not pre-initialized. Initializing now in getAuth().");
    auth = getAdminAuth();
  }
  return auth;
}

export {admin};
