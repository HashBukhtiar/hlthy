import * as admin from "firebase-admin";

let dbInstance: admin.firestore.Firestore;
let authInstance: admin.auth.Auth;

export function initializeDbAndAuth() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  dbInstance = admin.firestore();
  authInstance = admin.auth();
  console.log("Firebase Admin SDK initialized and instances set by initializeDbAndAuth.");
}

export function getDb(): admin.firestore.Firestore {
  if (!dbInstance) {
    throw new Error("Firestore 'db' has not been initialized. Ensure onInit completed.");
  }
  return dbInstance;
}

export function getAuth(): admin.auth.Auth {
  if (!authInstance) {
    throw new Error("Firebase Auth 'auth' has not been initialized. Ensure onInit completed.");
  }
  return authInstance;
}

export {admin};
