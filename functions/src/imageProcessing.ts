import {onObjectFinalized} from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import sharp from "sharp";

const db = admin.firestore();

export const generatethumbnail = onObjectFinalized({region: "us-east1"}, async (event) => {
  const {bucket: fileBucket, name: filePath, contentType} = event.data;

  if (!filePath || !contentType) {
    console.log("Exiting: Missing file path or content type.");
    return null;
  }

  // Exit if this is not an image or if it's already a thumbnail.
  if (!contentType.startsWith("image/") || path.basename(filePath).startsWith("thumb_")) {
    console.log("Exiting: Not an image or already a thumbnail.");
    return null;
  }

  // Exit if the image is not in a 'posts' directory.
  if (!filePath.startsWith("posts/")) {
    console.log("Exiting: Not a post image.");
    return null;
  }

  const bucket = admin.storage().bucket(fileBucket);
  const fileName = path.basename(filePath);
  const tempFilePath = path.join(os.tmpdir(), fileName);
  const metadata = {contentType: contentType};

  await bucket.file(filePath).download({destination: tempFilePath});
  console.log("Image downloaded locally to", tempFilePath);

  const thumbFileName = `thumb_${fileName}`;
  const thumbFilePath = path.join(os.tmpdir(), thumbFileName);
  const THUMB_MAX_WIDTH = 400;
  const THUMB_MAX_HEIGHT = 400;

  // Generate a thumbnail using sharp
  await sharp(tempFilePath).resize(THUMB_MAX_WIDTH, THUMB_MAX_HEIGHT, {fit: "inside"}).toFile(thumbFilePath);

  // Upload the thumbnail
  const thumbUploadPath = path.join(path.dirname(filePath), thumbFileName);
  await bucket.upload(thumbFilePath, {
    destination: thumbUploadPath,
    metadata: metadata,
  });

  // Clean up the local files
  fs.unlinkSync(tempFilePath);
  fs.unlinkSync(thumbFilePath);

  // Get the public URLs
  const originalFile = bucket.file(filePath);
  const thumbFile = bucket.file(thumbUploadPath);
  const [originalUrl] = await originalFile.getSignedUrl({action: "read", expires: "03-09-2491"});
  const [thumbnailUrl] = await thumbFile.getSignedUrl({action: "read", expires: "03-09-2491"});

  // Find the post document with the original image URL and update it
  const postsRef = db.collection("posts");
  const q = postsRef.where("imageUrl", "==", originalUrl).limit(1);
  const querySnapshot = await q.get();

  if (!querySnapshot.empty) {
    const postDoc = querySnapshot.docs[0];
    console.log(`Found post ${postDoc.id}, updating with thumbnail URL.`);
    return postDoc.ref.update({thumbnailUrl: thumbnailUrl});
  } else {
    console.warn("Could not find post document for image:", filePath);
    return null;
  }
});
