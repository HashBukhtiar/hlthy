import { admin, getDb } from '../admin/firebaseAdmin';
import { onDocumentCreated, onDocumentDeleted, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';

const DOMAIN = 'TagTriggers';

// Valid tag format: lowercase alphanumeric, underscore, hyphen. 1-32 characters.
const TAG_PATTERN = /^[a-z0-9_-]{1,32}$/;

/**
 * Validate that a tag is safe to use as a Firestore document ID.
 * Returns true if the tag matches the allowed pattern.
 */
function isValidTag(tag: unknown): tag is string {
  return typeof tag === 'string' && TAG_PATTERN.test(tag);
}

/**
 * Update tag post counts when a post is created.
 * Increments postCount for each tag and creates tag documents if they don't exist.
 */
export const updateTagCountOnPostCreate = onDocumentCreated(
  {
    document: 'posts/{postId}',
    region: 'northamerica-northeast2',
  },
  async (event) => {
    const db = getDb();
    const postData = event.data?.data();
    if (!postData) return;

    const tags: unknown[] = postData.tags || [];
    if (tags.length === 0) return;

    const batch = db.batch();

    try {
      for (const tag of tags) {
        // Skip invalid tags to prevent Firestore document ID issues
        if (!isValidTag(tag)) {
          logger.warn(DOMAIN, `Skipping invalid tag: ${tag}`);
          continue;
        }

        const tagRef = db.collection('hashtags').doc(tag);
        const tagSnapshot = await tagRef.get();

        if (tagSnapshot.exists) {
          // Increment existing tag
          batch.update(tagRef, {
            postCount: admin.firestore.FieldValue.increment(1),
          });
        } else {
          // Create new tag
          batch.set(tagRef, {
            name: tag,
            postCount: 1,
            isBanned: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      await batch.commit();
      logger.info(`Updated tag counts for post ${event.params.postId}`);
    } catch (error) {
      logger.error('Error updating tag counts on post create:', error);
    }
  }
);

/**
 * Update tag post counts when a post is deleted.
 * Decrements postCount for each tag (floors at 0).
 */
export const updateTagCountOnPostDelete = onDocumentDeleted(
  {
    document: 'posts/{postId}',
    region: 'northamerica-northeast2',
  },
  async (event) => {
    const db = getDb();
    const postData = event.data?.data();
    if (!postData) return;

    const tags: unknown[] = postData.tags || [];
    if (tags.length === 0) return;

    const batch = db.batch();

    try {
      for (const tag of tags) {
        // Skip invalid tags to prevent Firestore document ID issues
        if (!isValidTag(tag)) {
          logger.warn(DOMAIN, `Skipping invalid tag: ${tag}`);
          continue;
        }

        const tagRef = db.collection('hashtags').doc(tag);
        batch.update(tagRef, {
          postCount: admin.firestore.FieldValue.increment(-1),
        });
      }

      await batch.commit();
      logger.info(`Decremented tag counts for post ${event.params.postId}`);
    } catch (error) {
      logger.error('Error updating tag counts on post delete:', error);
    }
  }
);

/**
 * Update tag post counts when a post is edited.
 * Handles diff between old and new tags: decrements removed, increments added.
 * Also filters out banned tags from the final tags array.
 */
export const updateTagCountOnPostEdit = onDocumentWritten(
  {
    document: 'posts/{postId}',
    region: 'northamerica-northeast2',
  },
  async (event) => {
    const db = getDb();
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    // Only process updates (not creates or deletes)
    if (!beforeData || !afterData) return;

    const oldTags: string[] = beforeData.tags || [];
    const newTags: string[] = afterData.tags || [];

    // If tags didn't change, nothing to do
    if (JSON.stringify(oldTags.sort()) === JSON.stringify(newTags.sort())) {
      return;
    }

    const oldSet = new Set(oldTags);
    const newSet = new Set(newTags);

    // Compute diff
    const added = Array.from(newSet).filter((tag) => !oldSet.has(tag));
    const removed = Array.from(oldSet).filter((tag) => !newSet.has(tag));

    // Check for banned tags and filter them out
    let filteredTags = newTags;
    const bannedTags: string[] = [];

    try {
      const batch = db.batch();

      for (const tag of added) {
        const tagRef = db.collection('hashtags').doc(tag);
        const tagSnapshot = await tagRef.get();

        if (tagSnapshot.exists && tagSnapshot.data()?.isBanned) {
          bannedTags.push(tag);
        } else if (tagSnapshot.exists) {
          batch.update(tagRef, {
            postCount: admin.firestore.FieldValue.increment(1),
          });
        } else {
          batch.set(tagRef, {
            name: tag,
            postCount: 1,
            isBanned: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      for (const tag of removed) {
        // Skip invalid tags to prevent Firestore document ID issues
        if (!isValidTag(tag)) {
          logger.warn(DOMAIN, `Skipping invalid tag: ${tag}`);
          continue;
        }

        const tagRef = db.collection('hashtags').doc(tag);
        batch.update(tagRef, {
          postCount: admin.firestore.FieldValue.increment(-1),
        });
      }

      // Remove banned tags from the post
      if (bannedTags.length > 0) {
        filteredTags = newTags.filter((tag) => !bannedTags.includes(tag));
        batch.update(event.data!.after!.ref, {
          tags: filteredTags,
        });
      }

      await batch.commit();
      logger.info(
        `Updated tag counts for edited post ${event.params.postId}: +${added.length}, -${removed.length}`
      );

      if (bannedTags.length > 0) {
        logger.info(
          `Filtered ${bannedTags.length} banned tag(s) from post ${event.params.postId}`
        );
      }
    } catch (error) {
      logger.error('Error updating tag counts on post edit:', error);
    }
  }
);

/**
 * Update tag post counts when a workout is created.
 * Increments postCount for each tag and creates tag documents if they don't exist.
 */
export const updateTagCountOnWorkoutCreate = onDocumentCreated(
  {
    document: 'workouts/{workoutId}',
    region: 'northamerica-northeast2',
  },
  async (event) => {
    const db = getDb();
    const workoutData = event.data?.data();
    if (!workoutData) return;

    const tags: unknown[] = workoutData.tags || [];
    if (tags.length === 0) return;

    const batch = db.batch();

    try {
      for (const tag of tags) {
        // Skip invalid tags to prevent Firestore document ID issues
        if (!isValidTag(tag)) {
          logger.warn(DOMAIN, `Skipping invalid tag: ${tag}`);
          continue;
        }

        const tagRef = db.collection('hashtags').doc(tag);
        const tagSnapshot = await tagRef.get();

        if (tagSnapshot.exists) {
          batch.update(tagRef, {
            postCount: admin.firestore.FieldValue.increment(1),
          });
        } else {
          batch.set(tagRef, {
            name: tag,
            postCount: 1,
            isBanned: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      await batch.commit();
      logger.info(`Updated tag counts for workout ${event.params.workoutId}`);
    } catch (error) {
      logger.error('Error updating tag counts on workout create:', error);
    }
  }
);

/**
 * Update tag post counts when a workout is deleted.
 */
export const updateTagCountOnWorkoutDelete = onDocumentDeleted(
  {
    document: 'workouts/{workoutId}',
    region: 'northamerica-northeast2',
  },
  async (event) => {
    const db = getDb();
    const workoutData = event.data?.data();
    if (!workoutData) return;

    const tags: unknown[] = workoutData.tags || [];
    if (tags.length === 0) return;

    const batch = db.batch();

    try {
      for (const tag of tags) {
        // Skip invalid tags to prevent Firestore document ID issues
        if (!isValidTag(tag)) {
          logger.warn(DOMAIN, `Skipping invalid tag: ${tag}`);
          continue;
        }

        const tagRef = db.collection('hashtags').doc(tag);
        batch.update(tagRef, {
          postCount: admin.firestore.FieldValue.increment(-1),
        });
      }

      await batch.commit();
      logger.info(`Decremented tag counts for workout ${event.params.workoutId}`);
    } catch (error) {
      logger.error('Error updating tag counts on workout delete:', error);
    }
  }
);

/**
 * Update tag post counts when a workout is edited.
 * Handles diff between old and new tags and filters out banned tags.
 */
export const updateTagCountOnWorkoutEdit = onDocumentWritten(
  {
    document: 'workouts/{workoutId}',
    region: 'northamerica-northeast2',
  },
  async (event) => {
    const db = getDb();
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    if (!beforeData || !afterData) return;

    const oldTags: string[] = beforeData.tags || [];
    const newTags: string[] = afterData.tags || [];

    if (JSON.stringify(oldTags.sort()) === JSON.stringify(newTags.sort())) {
      return;
    }

    const oldSet = new Set(oldTags);
    const newSet = new Set(newTags);

    const added = Array.from(newSet).filter((tag) => !oldSet.has(tag));
    const removed = Array.from(oldSet).filter((tag) => !newSet.has(tag));

    let filteredTags = newTags;
    const bannedTags: string[] = [];

    try {
      const batch = db.batch();

      for (const tag of added) {
        const tagRef = db.collection('hashtags').doc(tag);
        const tagSnapshot = await tagRef.get();

        if (tagSnapshot.exists && tagSnapshot.data()?.isBanned) {
          bannedTags.push(tag);
        } else if (tagSnapshot.exists) {
          batch.update(tagRef, {
            postCount: admin.firestore.FieldValue.increment(1),
          });
        } else {
          batch.set(tagRef, {
            name: tag,
            postCount: 1,
            isBanned: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      for (const tag of removed) {
        // Skip invalid tags to prevent Firestore document ID issues
        if (!isValidTag(tag)) {
          logger.warn(DOMAIN, `Skipping invalid tag: ${tag}`);
          continue;
        }

        const tagRef = db.collection('hashtags').doc(tag);
        batch.update(tagRef, {
          postCount: admin.firestore.FieldValue.increment(-1),
        });
      }

      if (bannedTags.length > 0) {
        filteredTags = newTags.filter((tag) => !bannedTags.includes(tag));
        batch.update(event.data!.after!.ref, {
          tags: filteredTags,
        });
      }

      await batch.commit();
      logger.info(
        `Updated tag counts for edited workout ${event.params.workoutId}: +${added.length}, -${removed.length}`
      );

      if (bannedTags.length > 0) {
        logger.info(
          `Filtered ${bannedTags.length} banned tag(s) from workout ${event.params.workoutId}`
        );
      }
    } catch (error) {
      logger.error('Error updating tag counts on workout edit:', error);
    }
  }
);
