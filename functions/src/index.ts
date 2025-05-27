import {onInit} from "firebase-functions/v2/core";
import {initializeApp as initializeAdminApp} from "./firebaseAdmin";

export const initializeadminoninit = onInit(async () => {
  console.log("index.ts: onInit triggered for admin app initialization.");
  initializeAdminApp();
  console.log("index.ts: Admin app initialization complete in onInit.");
});

export * from "./activityTriggers";
export * from "./callableFunctions";
