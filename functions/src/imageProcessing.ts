import {onObjectFinalized} from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import sharp from "sharp";

const db = admin.firestore();

// Define runtime options to increase memory and timeout, and add retry logic
const runtimeOpts = {
  timeoutSeconds: 300, // 5 minutes
  memory: "1GiB" as const,
  retry: true, // Enable retries on failure
};

export const generatePostThumbnail = onObjectFinalized({region: "us-east1", ...runtimeOpts}, async (event) => {
  const {bucket: fileBucket, name: filePath, contentType, metadata: fileMetadata} = event.data;

  console.log("Raw event metadata object:", fileMetadata);

  if (!filePath || !contentType) {
    console.log("Exiting: Missing file path or content type.");
    return null;
  }

  // Check if this is a workout cover image
  if (fileMetadata?.workoutId) {
    console.log("This is a workout cover image, letting generateWorkoutCoverThumbnail handle it.");
    return null;
  }

  const postId = fileMetadata?.postId; // Get postId from custom metadata
  if (!postId) {
    console.log("Exiting: No postId found in custom metadata.");
    return null;
  }

  // Exit if this is not an image or if it's already a thumbnail.
  if (!contentType.startsWith("image/") || path.basename(filePath).startsWith("thumb_")) {
    console.log(`Exiting for post ${postId}: Not a processable image or already a thumbnail.`);
    return null;
  }

  const bucket = admin.storage().bucket(fileBucket);
  const fileName = path.basename(filePath);
  const tempFilePath = path.join(os.tmpdir(), fileName);
  // Preserve the custom metadata when uploading the thumbnail
  const metadata = {
    contentType: "image/jpeg",
    cacheControl: "public,max-age=31536000", // Cache for 1 year
    customMetadata: {
      postId: postId,
    },
  };

  try {
    await bucket.file(filePath).download({destination: tempFilePath});
    console.log(`Image for post ${postId} downloaded locally.`);
    const thumbFileName = `thumb_${fileName}`;
    const thumbFilePath = path.join(os.tmpdir(), thumbFileName);
    await sharp(tempFilePath).resize(400, 400, {fit: "inside"}).jpeg({quality: 80}).toFile(thumbFilePath);
    const thumbUploadPath = path.join(path.dirname(filePath), thumbFileName);
    await bucket.upload(thumbFilePath, {destination: thumbUploadPath, metadata});
    fs.unlinkSync(tempFilePath);
    fs.unlinkSync(thumbFilePath);
    const thumbFile = bucket.file(thumbUploadPath);
    // Make the file publicly accessible
    await thumbFile.makePublic();
    // Get permanent download URL instead of signed URL
    const thumbnailUrl = `https://storage.googleapis.com/${bucket.name}/${thumbUploadPath}`;
    // Update the document directly using the postId from metadata
    console.log(`Found post ${postId} from metadata, updating with thumbnail URL.`);
    // Use set with merge: true to create the document if it doesn't exist, or update it if it does.
    return db.collection("posts").doc(postId).set({thumbnailUrl}, {merge: true});
  } catch (error) {
    console.error(`Failed to process image for post ${postId}. Error:`, error);
    return null;
  }
});

export const generateWorkoutCoverThumbnail = onObjectFinalized({region: "us-east1", ...runtimeOpts}, async (event) => {
  const {bucket: fileBucket, name: filePath, contentType, metadata: fileMetadata} = event.data;

  console.log("generateWorkoutCoverThumbnail - Raw event metadata object:", fileMetadata);

  if (!filePath || !contentType) {
    console.log("generateWorkoutCoverThumbnail - Exiting: Missing file path or content type.");
    return null;
  }

  // Only proceed if this has workout metadata
  if (!fileMetadata?.workoutId) {
    console.log("generateWorkoutCoverThumbnail - Exiting: No workoutId found in custom metadata.");
    return null;
  }

  const workoutId = fileMetadata.workoutId;

  if (!contentType.startsWith("image/") || path.basename(filePath).startsWith("thumb_")) {
    console.log(`generateWorkoutCoverThumbnail - Exiting for workout ${workoutId}: Not a processable image or already a thumbnail.`);
    return null;
  }

  const bucket = admin.storage().bucket(fileBucket);
  const fileName = path.basename(filePath);
  const tempFilePath = path.join(os.tmpdir(), fileName);
  // Preserve the custom metadata when uploading the thumbnail
  const metadata = {
    contentType: "image/jpeg",
    cacheControl: "public,max-age=31536000", // Cache for 1 year
    customMetadata: {
      workoutId: workoutId,
    },
  };

  try {
    await bucket.file(filePath).download({destination: tempFilePath});
    console.log(`generateWorkoutCoverThumbnail - Image for workout ${workoutId} downloaded locally.`);
    const thumbFileName = `thumb_${fileName}`;
    const thumbFilePath = path.join(os.tmpdir(), thumbFileName);
    await sharp(tempFilePath).resize(400, 400, {fit: "inside"}).jpeg({quality: 80}).toFile(thumbFilePath);
    const thumbUploadPath = path.join(path.dirname(filePath), thumbFileName);
    await bucket.upload(thumbFilePath, {destination: thumbUploadPath, metadata});
    fs.unlinkSync(tempFilePath);
    fs.unlinkSync(thumbFilePath);
    const thumbFile = bucket.file(thumbUploadPath);
    // Make the file publicly accessible
    await thumbFile.makePublic();
    // Get permanent download URL instead of signed URL
    const thumbnailUrl = `https://storage.googleapis.com/${bucket.name}/${thumbUploadPath}`;
    // Update the document directly using the workoutId from metadata
    console.log(`generateWorkoutCoverThumbnail - Found workout ${workoutId} from metadata, updating with thumbnail URL.`);
    // Use set with merge: true to create the document if it doesn't exist, or update it if it does.
    return db.collection("workouts").doc(workoutId).set({thumbnailUrl}, {merge: true});
  } catch (error) {
    console.error(`generateWorkoutCoverThumbnail - Failed to process image for workout ${workoutId}. Error:`, error);
    return null;
  }
});

export const generateProfileThumbnail = onObjectFinalized({
  region: "us-east1",
  ...runtimeOpts,
}, async (event) => {
  const {bucket: fileBucket, name: filePath, contentType} = event.data;

  if (!filePath || !contentType) return null;

  // Check if this is a profile image
  if (!filePath.includes("profileImages/") || !contentType.startsWith("image/")) {
    return null;
  }

  // Skip if already a thumbnail
  if (path.basename(filePath).startsWith("thumb_")) {
    return null;
  }

  const bucket = admin.storage().bucket(fileBucket);
  const fileName = path.basename(filePath);
  const tempFilePath = path.join(os.tmpdir(), fileName);

  try {
    await bucket.file(filePath).download({destination: tempFilePath});
    // Create 150x150 profile thumbnail
    const thumbFileName = `thumb_${fileName}`;
    const thumbFilePath = path.join(os.tmpdir(), thumbFileName);
    await sharp(tempFilePath)
      .resize(150, 150, {fit: "cover"})
      .jpeg({quality: 80})
      .toFile(thumbFilePath);

    const thumbUploadPath = path.join(path.dirname(filePath), thumbFileName);
    await bucket.upload(thumbFilePath, {
      destination: thumbUploadPath,
      metadata: {
        contentType: "image/jpeg",
        cacheControl: "public,max-age=31536000", // Cache for 1 year
      },
    });
    // Make the file publicly accessible
    await bucket.file(thumbUploadPath).makePublic();
    // Get permanent download URL instead of signed URL
    const thumbUrl = `https://storage.googleapis.com/${bucket.name}/${thumbUploadPath}`;

    // Extract userId from path: profileImages/{userId}/filename.jpg
    const userId = filePath.split("/")[1];
    if (userId) {
      await admin.firestore().doc(`users/${userId}`).update({
        profileThumbnailUrl: thumbUrl,
      });
    }

    // Cleanup
    fs.unlinkSync(tempFilePath);
    fs.unlinkSync(thumbFilePath);
    return null;
  } catch (error) {
    console.error("Error processing profile thumbnail:", error);
    return null;
  }
});
