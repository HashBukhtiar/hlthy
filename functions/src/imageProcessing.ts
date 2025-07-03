import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import sharp from "sharp";
import {getStorage} from "firebase-admin/storage";

const db = admin.firestore();

export const generatethumbnail = onDocumentCreated("posts/{postId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log("No data associated with the event");
    return;
  }
  const postData = snapshot.data();
  const imageUrl = postData.imageUrl;

  // Exit if there's no imageUrl or if a thumbnail already exists.
  if (!imageUrl || postData.thumbnailUrl) {
    console.log("Exiting: No image URL or thumbnail already exists.");
    return;
  }

  const bucket = getStorage().bucket();
  // Extract the file path from the URL
  // The path is between '/o/' and '?alt=media'
  const urlParts = imageUrl.split("/o/");
  if (urlParts.length < 2) {
    console.log("Invalid imageUrl format. Could not extract file path.");
    return;
  }
  const filePath = decodeURIComponent(urlParts[1].split("?")[0]);
  const fileName = path.basename(filePath);
  const tempFilePath = path.join(os.tmpdir(), fileName);
  const metadata = {contentType: "image/jpeg"}; // Assuming jpeg, can be improved

  // Exit if it's already a thumbnail (a failsafe)
  if (fileName.startsWith("thumb_")) {
    console.log("This is already a thumbnail.");
    return;
  }

  await bucket.file(filePath).download({destination: tempFilePath});
  console.log("Image downloaded locally to", tempFilePath);

  const thumbFileName = `thumb_${fileName}`;
  const thumbFilePath = path.join(os.tmpdir(), thumbFileName);
  const THUMB_MAX_WIDTH = 400;
  const THUMB_MAX_HEIGHT = 400;

  await sharp(tempFilePath).resize(THUMB_MAX_WIDTH, THUMB_MAX_HEIGHT, {fit: "inside"}).toFile(thumbFilePath);

  const thumbUploadPath = path.join(path.dirname(filePath), thumbFileName);
  await bucket.upload(thumbFilePath, {
    destination: thumbUploadPath,
    metadata: metadata,
  });

  fs.unlinkSync(tempFilePath);
  fs.unlinkSync(thumbFilePath);

  const thumbFile = bucket.file(thumbUploadPath);
  const [thumbnailUrl] = await thumbFile.getSignedUrl({action: "read", expires: "03-09-2491"});

  console.log(`Updating post ${snapshot.id} with thumbnail URL.`);
  return db.collection("posts").doc(snapshot.id).update({thumbnailUrl: thumbnailUrl});
});
