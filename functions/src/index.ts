import {onInit} from "firebase-functions/v2";
import {initializeDbAndAuth} from "./firebaseAdmin";

// Use onInit to initialize Firebase Admin SDK by calling the centralized initializer
export const initializeadmin = onInit(async () => {
  console.log("onInit: Triggering Firebase Admin SDK initialization via firebaseAdmin.ts...");
  initializeDbAndAuth();
});

export * from "./activityTriggers";
export * from "./callableFunctions";
