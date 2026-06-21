/**
 * Tests for the account-deletion registry. The Firebase Admin SDK is mocked and
 * a hand-built fake Firestore records the writes, so we can assert the full
 * purge: reverse social-graph edges, both-sided DM deletion, comment scrub,
 * registry-driven collection deletes, identity tombstone, and Storage cleanup.
 */

// Self-contained admin mock (no out-of-scope references). getDb is configured
// per-test; storage/serverTimestamp are stable jest.fns we can inspect.
jest.mock("../../admin/firebaseAdmin", () => {
  const deleteFiles = jest.fn(() => Promise.resolve());
  const bucket = jest.fn(() => ({deleteFiles}));
  return {
    admin: {
      firestore: {FieldValue: {serverTimestamp: jest.fn(() => "TS")}},
      storage: jest.fn(() => ({bucket})),
    },
    getDb: jest.fn(),
  };
});

import {admin, getDb} from "../../admin/firebaseAdmin";
import {
  deleteAllUserData,
  FIRESTORE_TARGETS,
  STORAGE_TARGETS,
} from "../accountDeletion";

const UID = "u123";

// Recorders reset before each test.
let recursiveDeletePaths: string[];
let bulkDeletes: string[];
let bulkUpdates: Array<{path: string; data: any}>;
let setCalls: Array<{path: string; data: any}>;

function makeRef(path: string) {
  return {
    path,
    id: path.split("/").pop(),
    set: (data: any) => {
      setCalls.push({path, data});
      return Promise.resolve();
    },
    listCollections: () => Promise.resolve([]),
  };
}

function snap(docs: any[]) {
  return {docs, empty: docs.length === 0, size: docs.length};
}

function buildFakeDb(snapshots: Record<string, any[]>) {
  return {
    collection: (path: string) => ({
      get: () => Promise.resolve(snap(snapshots[path] || [])),
      where: () => ({get: () => Promise.resolve(snap(snapshots[path] || []))}),
    }),
    collectionGroup: (name: string) => ({
      where: () => ({get: () => Promise.resolve(snap(snapshots[`cg:${name}`] || []))}),
    }),
    doc: (path: string) => makeRef(path),
    bulkWriter: () => ({
      onWriteError: () => {},
      delete: (ref: any) => {
        bulkDeletes.push(ref.path);
      },
      update: (ref: any, data: any) => {
        bulkUpdates.push({path: ref.path, data});
      },
      close: () => Promise.resolve(),
    }),
    recursiveDelete: (target: any) => {
      recursiveDeletePaths.push(target.path);
      return Promise.resolve();
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  recursiveDeletePaths = [];
  bulkDeletes = [];
  bulkUpdates = [];
  setCalls = [];
});

describe("deletion registry", () => {
  it("keeps users/{uid} OUT of FIRESTORE_TARGETS (it is tombstoned, not deleted)", () => {
    const paths = FIRESTORE_TARGETS.map((t) => (t.path ? t.path(UID) : t.collection));
    expect(paths).not.toContain(`users/${UID}`);
  });

  it("covers the expected owned collections and storage prefixes", () => {
    const collections = FIRESTORE_TARGETS.map((t) => t.collection).filter(Boolean);
    expect(collections).toEqual(expect.arrayContaining(["posts", "milestones", "workouts"]));
    const prefixes = STORAGE_TARGETS.map((t) => t.prefix(UID));
    expect(prefixes).toEqual([
      `profileImages/${UID}/`,
      `posts/${UID}/`,
      `workoutCovers/${UID}/`,
    ]);
  });
});

describe("deleteAllUserData", () => {
  it("throws if Firestore is not initialized", async () => {
    (getDb as jest.Mock).mockReturnValue(null);
    await expect(deleteAllUserData(UID)).rejects.toThrow("Firestore not initialized");
  });

  it("performs a full cross-collection purge", async () => {
    const convDoc = {
      id: "c1",
      ref: makeRef("conversations/c1"),
      get: (k: string) => (k === "participants" ? [UID, "other"] : undefined),
    };
    const snapshots: Record<string, any[]> = {
      [`users/${UID}/following`]: [{id: "f1"}],
      [`users/${UID}/followers`]: [{id: "f2"}],
      [`users/${UID}/mentionBlocks`]: [],
      conversations: [convDoc],
      posts: [{ref: makeRef("posts/p1")}],
      milestones: [],
      workouts: [],
      "cg:messageRequests": [],
      "cg:comments": [{ref: makeRef("posts/p1/comments/cm1")}],
      "cg:replies": [],
    };
    (getDb as jest.Mock).mockReturnValue(buildFakeDb(snapshots));

    await deleteAllUserData(UID);

    // Reverse social-graph edges + both-sided DM refs.
    expect(bulkDeletes).toEqual(
      expect.arrayContaining([
        `users/f1/followers/${UID}`,
        `users/f2/following/${UID}`,
        `users/${UID}/conversations/c1`,
        "users/other/conversations/c1",
      ])
    );

    // Comment authored by the user is scrubbed (not deleted).
    expect(bulkUpdates).toHaveLength(1);
    expect(bulkUpdates[0].path).toBe("posts/p1/comments/cm1");
    expect(bulkUpdates[0].data.authorDeleted).toBe(true);

    // recursiveDelete hits the conversation, the per-user roots, and owned posts.
    expect(recursiveDeletePaths).toEqual(
      expect.arrayContaining(["conversations/c1", `feeds/${UID}`, `activity/${UID}`, "posts/p1"])
    );

    // Identity tombstoned (overwritten with the deleted marker), not removed.
    expect(setCalls.map((c) => c.path)).toEqual([`users/${UID}`, `usersPublic/${UID}`]);
    expect(setCalls[0].data.deleted).toBe(true);
    expect(setCalls[0].data.displayName).toBe("Deleted User");

    // Storage: conversation photos + all per-user prefixes.
    const deleteFiles = (admin.storage() as any).bucket().deleteFiles as jest.Mock;
    const prefixes = deleteFiles.mock.calls.map((c) => c[0].prefix);
    expect(prefixes).toEqual(
      expect.arrayContaining([
        "conversations/c1/",
        `profileImages/${UID}/`,
        `posts/${UID}/`,
        `workoutCovers/${UID}/`,
      ])
    );
  });
});
