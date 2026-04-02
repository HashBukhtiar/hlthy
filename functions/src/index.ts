import {onInit} from "firebase-functions/v2/core";
import {initializeDbAndAuth} from "./admin/firebaseAdmin";

export const initializeadminoninit = onInit(async () => {
  console.log("index.ts: onInit triggered.");
  initializeDbAndAuth();
  console.log("index.ts: initializeDbAndAuth called from onInit.");
});

export * from "./triggers/activityTriggers";
export * from "./callables/callableFunctions";
export * from "./triggers/milestoneTriggers";
export * from "./triggers/imageProcessing";
export * from "./triggers/feedTriggers";
export * from "./triggers/followTriggers";
export * from "./admin/adminFunctions";
export * from "./services/settingsService";
export * from "./services/messageService";
export * from "./services/notificationService";
export * from "./services/authCleanupService";
export * from "./callables/checkEmailExists";
export * from "./callables/mentionSearch";
export * from "./callables/hashtagSearch";
export * from "./triggers/mentionTriggers";
export * from "./triggers/tagTriggers";
export * from "./triggers/countTriggers";
