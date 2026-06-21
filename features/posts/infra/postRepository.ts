import {
  doc,
  getDoc,
  arrayUnion,
  arrayRemove,
  collection,
  addDoc,
  query,
  where,
  setDoc,
  getDocs,
  writeBatch,
  deleteDoc,
  orderBy,
  limit,
  startAfter,
  increment,
  runTransaction,
  Timestamp,
  serverTimestamp,
  updateDoc,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Post, Comment, Reply, PostAuthorProfile } from '@/features/posts/domain/Post';
import { MentionData } from '@/features/mentions/domain/Mention';
import { sanitizeText, TEXT_LIMITS } from '@/logic/sanitize';

// ── Private helpers ─────────────────────────────────────────────────────────

async function hydrateAuthor(post: Post): Promise<void> {
  const snap = await getDoc(doc(db, 'users', post.authorId));
  if (snap.exists()) {
    const u = snap.data() as any;
    post.authorProfileImageUrl = u.profileImageUrl ?? '';
    post.authorProfileThumbnailUrl = u.profileThumbnailUrl ?? '';
    post.authorBlockedUsers = u.blockedUsers ?? [];
  }
}

async function hydrateCommentAuthor(comment: Comment): Promise<void> {
  const snap = await getDoc(doc(db, 'users', comment.authorId));
  if (snap.exists()) {
    const u = snap.data() as any;
    comment.authorProfileImageUrl = u.profileImageUrl ?? '';
    comment.authorProfileThumbnailUrl = u.profileThumbnailUrl ?? '';
    comment.authorBlockedUsers = u.blockedUsers ?? [];
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Opaque cursor for comment pagination (re-exported so callers avoid firestore imports). */
export type CommentCursor = QueryDocumentSnapshot<DocumentData>;

export interface CommentPage {
  comments: Comment[];
  cursor: CommentCursor | null;
}

export const PostRepository = {
  /** Fetches all public posts ordered by creation date. */
  async fetchPublicPosts(uid: string): Promise<Post[]> {
    const q = query(
      collection(db, 'posts'),
      where('visibility', '==', 'public'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);

    const posts: Post[] = [];
    for (const d of snap.docs) {
      const post = { ...(d.data() as Post), id: d.id };
      await hydrateAuthor(post);
      const likeSnap = await getDoc(doc(db, 'posts', post.id, 'likers', uid));
      post.isLiked = likeSnap.exists();
      posts.push(post);
    }
    return posts;
  },

  /** Fetches a single post by ID with author profile, like status, and bookmark status. */
  async getById(postId: string, uid: string): Promise<Post> {
    const snap = await getDoc(doc(db, 'posts', postId));
    if (!snap.exists()) throw new Error('Post not found');
    const post = { ...(snap.data() as Post), id: snap.id };
    await hydrateAuthor(post);
    const [likeSnap, bookmarkSnap] = await Promise.all([
      getDoc(doc(db, 'posts', postId, 'likers', uid)),
      getDoc(doc(db, 'users', uid, 'savedPosts', postId)).catch(() => null),
    ]);
    post.isLiked = likeSnap.exists();
    post.isBookmarked = bookmarkSnap?.exists() ?? false;
    return post;
  },

  /**
   * Fetches a page of comments for a post (newest first) with author profiles
   * and like status. Author hydration runs in parallel. Pass `limitN`/`after`
   * for pagination; omit them to fetch everything (legacy behavior).
   */
  async getComments(
    postId: string,
    uid: string,
    opts?: { limitN?: number; after?: CommentCursor | null }
  ): Promise<CommentPage> {
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
    if (opts?.after) constraints.push(startAfter(opts.after));
    if (opts?.limitN) constraints.push(limit(opts.limitN));

    const snap = await getDocs(query(collection(db, 'posts', postId, 'comments'), ...constraints));

    const comments = await Promise.all(
      snap.docs.map(async (d) => {
        const data = d.data();
        const comment: Comment = {
          id: d.id,
          authorId: data.authorId,
          authorUsername: data.authorUsername,
          authorProfileImageUrl: '',
          text: data.text,
          createdAt: data.createdAt,
          likes: data.likes ?? 0,
          likedBy: data.likedBy ?? [],
          replyCount: data.replyCount ?? 0,
          mentions: data.mentions,
          isLiked: data.likedBy?.includes(uid) ?? false,
          replies: [],
        };
        await hydrateCommentAuthor(comment);
        return comment;
      })
    );

    const cursor = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    return { comments, cursor };
  },

  /**
   * Creates a regular post. Returns the new post ID.
   * For milestone posts, use updatePostImageUrl after calling the Cloud Function.
   */
  async createRegularPost(
    author: PostAuthorProfile,
    data: {
      caption?: string;
      imageUrl?: string | null;
      visibility: 'public' | 'followers';
      workoutId?: string | null;
      authorArchetype?: string | null;
      mentions?: MentionData[];
      tags?: string[];
    }
  ): Promise<string> {
    const postRef = doc(collection(db, 'posts'));
    await setDoc(postRef, {
      authorId: author.uid,
      authorUsername: author.username ?? 'Unknown user',
      authorProfileImageUrl: author.profileImageUrl ?? '',
      caption: sanitizeText(data.caption, TEXT_LIMITS.postCaption),
      imageUrl: data.imageUrl ?? null,
      createdAt: serverTimestamp(),
      isMilestone: false,
      milestoneDetails: null,
      reactionCount: 0,
      commentCount: 0,
      visibility: data.visibility ?? 'public',
      workoutId: data.workoutId ?? null,
      authorArchetype: data.authorArchetype ?? null,
      ...(data.mentions && data.mentions.length > 0 ? { mentions: data.mentions } : {}),
      ...(data.tags && data.tags.length > 0 ? { tags: data.tags } : {}),
    });
    return postRef.id;
  },

  /** Updates the imageUrl on a post after a Storage upload completes. */
  async updatePostImageUrl(postId: string, imageUrl: string): Promise<void> {
    await updateDoc(doc(db, 'posts', postId), { imageUrl });
  },

  async updatePostVideoUrl(postId: string, videoUrl: string, videoThumbnailUrl: string, videoDuration: number): Promise<void> {
    await updateDoc(doc(db, 'posts', postId), { videoUrl, videoThumbnailUrl, videoDuration });
  },

  /** Deletes a post and all its subcollections (comments, replies, likers). */
  async delete(postId: string, uid: string): Promise<void> {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) throw new Error('Post not found');
    if (postSnap.data().authorId !== uid) throw new Error('Not authorized to delete this post');

    // Delete comments + their replies
    const commentDocs = await getDocs(collection(db, 'posts', postId, 'comments'));
    await Promise.all(
      commentDocs.docs.map(async commentDoc => {
        const replyDocs = await getDocs(
          collection(db, 'posts', postId, 'comments', commentDoc.id, 'replies')
        );
        await Promise.all(replyDocs.docs.map(r => deleteDoc(r.ref)));
        await deleteDoc(commentDoc.ref);
      })
    );

    // Delete likers
    const likerDocs = await getDocs(collection(db, 'posts', postId, 'likers'));
    await Promise.all(likerDocs.docs.map(l => deleteDoc(l.ref)));

    await deleteDoc(postRef);
  },

  /** Returns the imageUrl of a post (for storage cleanup on delete). */
  async getImageUrl(postId: string): Promise<string | null> {
    const snap = await getDoc(doc(db, 'posts', postId));
    return snap.exists() ? (snap.data().imageUrl ?? null) : null;
  },

  /** Atomically adds a like to a post. No-ops if already liked. */
  async likePost(
    postId: string,
    uid: string,
    username: string,
    profileImageUrl: string
  ): Promise<void> {
    const postRef = doc(db, 'posts', postId);
    const likerRef = doc(db, 'posts', postId, 'likers', uid);

    await runTransaction(db, async tx => {
      // Read the liker doc inside the transaction so the counter is gated by the
      // actual source of truth — prevents a double-increment if two like calls race.
      const likerDoc = await tx.get(likerRef);
      if (likerDoc.exists()) return;
      tx.set(likerRef, { userId: uid, username, profileImageUrl, likedAt: serverTimestamp() });
      tx.update(postRef, { reactionCount: increment(1) });
    });
  },

  /**
   * Atomically removes a like from a post. The matching `post_like` activity
   * record is cleaned up server-side by the removeactivityonpostunlike trigger
   * (the liker can't read/query the author's activity collection under the
   * security rules, so it must not be done client-side).
   */
  async unlikePost(postId: string, uid: string): Promise<void> {
    const postRef = doc(db, 'posts', postId);
    const likerRef = doc(db, 'posts', postId, 'likers', uid);

    await runTransaction(db, async tx => {
      // Only decrement if a like actually exists. Without this guard, a stale
      // isLiked=true in one screen (e.g. the feed, after unliking from the detail
      // view) would unconditionally decrement and drive reactionCount negative.
      const likerDoc = await tx.get(likerRef);
      if (!likerDoc.exists()) return;
      tx.delete(likerRef);
      tx.update(postRef, { reactionCount: increment(-1) });
    });
  },

  /** Adds a comment to a post. Returns the new comment with a client-side timestamp. */
  async addComment(
    postId: string,
    uid: string,
    username: string,
    text: string,
    profileImageUrl: string = '',
    mentions?: MentionData[]
  ): Promise<Comment> {
    const cleanText = sanitizeText(text, TEXT_LIMITS.comment);
    if (!cleanText) throw new Error('Comment cannot be empty');
    const ref = await addDoc(collection(db, 'posts', postId, 'comments'), {
      text: cleanText,
      authorId: uid,
      authorUsername: username,
      createdAt: serverTimestamp(),
      likes: 0,
      likedBy: [],
      replyCount: 0,
      ...(mentions && mentions.length > 0 ? { mentions } : {}),
    });
    return {
      id: ref.id,
      text: cleanText,
      authorId: uid,
      authorUsername: username,
      authorProfileImageUrl: profileImageUrl,
      createdAt: Timestamp.now(),
      likes: 0,
      likedBy: [],
      replyCount: 0,
      mentions,
      isLiked: false,
      replies: [],
    };
  },

  /** Atomically likes a comment. No-ops if already liked. */
  async likeComment(postId: string, commentId: string, uid: string): Promise<void> {
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    const snap = await getDoc(commentRef);
    if (!snap.exists()) throw new Error('Comment not found');
    if ((snap.data().likedBy as string[]).includes(uid)) return;

    await runTransaction(db, async tx => {
      tx.update(commentRef, { likes: increment(1), likedBy: arrayUnion(uid) });
    });
  },

  /** Atomically unlikes a comment and cleans up activity. */
  async unlikeComment(postId: string, commentId: string, uid: string): Promise<void> {
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    const snap = await getDoc(commentRef);
    if (!snap.exists()) throw new Error('Comment not found');
    const data = snap.data();
    if (!(data.likedBy as string[]).includes(uid)) return;

    await runTransaction(db, async tx => {
      tx.update(commentRef, { likes: increment(-1), likedBy: arrayRemove(uid) });
    });

    if (data.authorId !== uid) {
      const q = query(
        collection(db, 'activity', data.authorId, 'userActivity'),
        where('type', '==', 'comment_like'),
        where('postId', '==', postId),
        where('commentId', '==', commentId),
        where('fromUserId', '==', uid),
        limit(1)
      );
      const actSnap = await getDocs(q);
      if (!actSnap.empty) {
        const batch = writeBatch(db);
        actSnap.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    }
  },

  /** Adds a reply to a comment using a transaction to increment replyCount. */
  async addReply(
    postId: string,
    parentCommentId: string,
    author: PostAuthorProfile,
    text: string,
    mentions?: MentionData[]
  ): Promise<Reply> {
    const parentRef = doc(db, 'posts', postId, 'comments', parentCommentId);
    const parentSnap = await getDoc(parentRef);
    if (!parentSnap.exists()) throw new Error('Parent comment not found');
    const parentData = parentSnap.data() as Comment;

    const cleanText = sanitizeText(text, TEXT_LIMITS.reply);
    if (!cleanText) throw new Error('Reply cannot be empty');

    const repliesRef = collection(db, 'posts', postId, 'comments', parentCommentId, 'replies');
    const newReplyRef = doc(repliesRef);

    const replyData = {
      parentCommentId,
      text: cleanText,
      authorId: author.uid,
      authorUsername: author.username,
      authorProfileImageUrl: author.profileImageUrl ?? '',
      authorProfileThumbnailUrl: author.profileThumbnailUrl ?? '',
      authorBlockedUsers: [],
      createdAt: serverTimestamp(),
      likes: 0,
      likedBy: [],
      replyToUserId: parentData.authorId,
      ...(mentions && mentions.length > 0 ? { mentions } : {}),
    };

    await runTransaction(db, async tx => {
      tx.set(newReplyRef, replyData);
      tx.update(parentRef, { replyCount: increment(1) });
    });

    return {
      id: newReplyRef.id,
      ...replyData,
      createdAt: Timestamp.now(),
      isLiked: false,
    } as Reply;
  },

  /** Fetches all replies for a comment with author profiles. */
  async getReplies(postId: string, commentId: string, uid: string): Promise<Reply[]> {
    const q = query(
      collection(db, 'posts', postId, 'comments', commentId, 'replies'),
      orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);

    const replies: Reply[] = [];
    for (const d of snap.docs) {
      const data = d.data();
      const reply: Reply = {
        id: d.id,
        parentCommentId: data.parentCommentId,
        authorId: data.authorId,
        authorUsername: data.authorUsername,
        authorProfileImageUrl: '',
        text: data.text,
        createdAt: data.createdAt,
        likes: data.likes ?? 0,
        likedBy: data.likedBy ?? [],
        replyToUserId: data.replyToUserId,
        mentions: data.mentions,
        isLiked: (data.likedBy ?? []).includes(uid),
      };
      const userSnap = await getDoc(doc(db, 'users', reply.authorId));
      if (userSnap.exists()) {
        const u = userSnap.data() as any;
        reply.authorProfileImageUrl = u.profileImageUrl ?? '';
        reply.authorProfileThumbnailUrl = u.profileThumbnailUrl ?? '';
      }
      replies.push(reply);
    }
    return replies;
  },

  /** Atomically likes a reply. No-ops if already liked. */
  async likeReply(postId: string, commentId: string, replyId: string, uid: string): Promise<void> {
    const replyRef = doc(db, 'posts', postId, 'comments', commentId, 'replies', replyId);
    const snap = await getDoc(replyRef);
    if (!snap.exists()) throw new Error('Reply not found');
    if ((snap.data().likedBy as string[]).includes(uid)) return;

    await runTransaction(db, async tx => {
      tx.update(replyRef, { likes: increment(1), likedBy: arrayUnion(uid) });
    });
  },

  /** Atomically unlikes a reply. */
  async unlikeReply(
    postId: string,
    commentId: string,
    replyId: string,
    uid: string
  ): Promise<void> {
    const replyRef = doc(db, 'posts', postId, 'comments', commentId, 'replies', replyId);
    const snap = await getDoc(replyRef);
    if (!snap.exists()) throw new Error('Reply not found');
    if (!(snap.data().likedBy as string[]).includes(uid)) return;

    await runTransaction(db, async tx => {
      tx.update(replyRef, { likes: increment(-1), likedBy: arrayRemove(uid) });
    });
  },

  /** Deletes a comment. Reply cascade and commentCount decrement are handled by the onCommentDeleted trigger. */
  async deleteComment(postId: string, commentId: string, uid: string): Promise<void> {
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);
    if (!commentSnap.exists()) throw new Error('Comment not found');

    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) throw new Error('Post not found');

    const isCommentAuthor = commentSnap.data().authorId === uid;
    const isPostAuthor = postSnap.data().authorId === uid;
    if (!isCommentAuthor && !isPostAuthor) throw new Error('Not authorized to delete this comment');

    await deleteDoc(commentRef);
  },

  /** Updates caption and tags on a post. Only the post author can edit. */
  async updatePost(postId: string, uid: string, caption: string, tags?: string[], mentions?: MentionData[]): Promise<void> {
    const postRef = doc(db, 'posts', postId);
    const snap = await getDoc(postRef);
    if (!snap.exists()) throw new Error('Post not found');
    if (snap.data().authorId !== uid) throw new Error('Not authorized to edit this post');
    await updateDoc(postRef, {
      caption,
      tags: tags && tags.length > 0 ? tags : [],
      ...(mentions !== undefined ? { mentions: mentions.length > 0 ? mentions : [] } : {}),
      editedAt: serverTimestamp(),
    });
  },

  /** Saves a post to the user's private bookmarks. */
  async savePost(postId: string, uid: string): Promise<void> {
    await setDoc(doc(db, 'users', uid, 'savedPosts', postId), {
      postId,
      savedAt: serverTimestamp(),
    });
  },

  /** Removes a post from the user's private bookmarks. */
  async unsavePost(postId: string, uid: string): Promise<void> {
    await deleteDoc(doc(db, 'users', uid, 'savedPosts', postId));
  },

  /** Fetches all posts bookmarked by the user, ordered by save date. */
  async fetchSavedPosts(uid: string): Promise<Post[]> {
    const savedSnap = await getDocs(
      query(collection(db, 'users', uid, 'savedPosts'), orderBy('savedAt', 'desc'))
    );
    const results = await Promise.all(
      savedSnap.docs.map(async (d): Promise<Post | null> => {
        try {
          const postSnap = await getDoc(doc(db, 'posts', d.data().postId));
          if (!postSnap.exists()) return null;
          const post: Post = { ...(postSnap.data() as Post), id: postSnap.id, isBookmarked: true };
          const [likeSnap] = await Promise.all([
            getDoc(doc(db, 'posts', post.id, 'likers', uid)),
            hydrateAuthor(post),
          ]);
          post.isLiked = likeSnap.exists();
          return post;
        } catch {
          // skip deleted posts silently
          return null;
        }
      })
    );
    return results.filter((p): p is Post => p !== null);
  },

  /** Updates the text of a comment. Only the comment author can edit. */
  async updateComment(
    postId: string,
    commentId: string,
    uid: string,
    newText: string,
    mentions?: MentionData[]
  ): Promise<void> {
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);
    if (!commentSnap.exists()) throw new Error('Comment not found');
    if (commentSnap.data().authorId !== uid) throw new Error('Not authorized to edit this comment');

    await updateDoc(commentRef, {
      text: newText,
      editedAt: serverTimestamp(),
      ...(mentions !== undefined ? { mentions: mentions.length > 0 ? mentions : [] } : {}),
    });
  },
};
