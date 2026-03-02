import {onDocumentCreated, onDocumentDeleted} from "firebase-functions/v2/firestore";
import {getFirestore, FieldValue} from "firebase-admin/firestore";

const db = getFirestore();

export const bumpCountsOnFollow = onDocumentCreated(
  "users/{followedUserId}/followers/{followerId}",
  async (event) => {
    const {followedUserId, followerId} = event.params;
    if (followedUserId === followerId) return; // edge-case guard

    const followedRef = db.collection("users").doc(followedUserId);
    const followerRef = db.collection("users").doc(followerId);

    await Promise.all([
      followedRef.update({
        "followerCount": FieldValue.increment(1),
        "stats.followerCount": FieldValue.increment(1),
      }),
      followerRef.update({
        "followingCount": FieldValue.increment(1),
        "stats.followingCount": FieldValue.increment(1),
      }),
    ]);
  }
);

export const bumpCountsOnUnfollow = onDocumentDeleted(
  "users/{followedUserId}/followers/{followerId}",
  async (event) => {
    const {followedUserId, followerId} = event.params;
    if (followedUserId === followerId) return;

    const followedRef = db.collection("users").doc(followedUserId);
    const followerRef = db.collection("users").doc(followerId);

    await Promise.all([
      followedRef.update({
        "followerCount": FieldValue.increment(-1),
        "stats.followerCount": FieldValue.increment(-1),
      }),
      followerRef.update({
        "followingCount": FieldValue.increment(-1),
        "stats.followingCount": FieldValue.increment(-1),
      }),
    ]);
  }
);
