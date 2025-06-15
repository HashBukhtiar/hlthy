import {onInit} from "firebase-functions/v2/core";
import {initializeDbAndAuth} from "./firebaseAdmin";

export const initializeadminoninit = onInit(async () => {
  console.log("index.ts: onInit triggered.");
  initializeDbAndAuth();
  console.log("index.ts: initializeDbAndAuth called from onInit.");
});

export * from "./activityTriggers";
export * from "./callableFunctions";
