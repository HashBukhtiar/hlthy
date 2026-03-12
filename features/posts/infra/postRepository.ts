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
  increment,
  runTransaction,
  Timestamp,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Post, Comment, Reply, PostAuthorProfile } from '@/features/posts/domain/Post';

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

  /** Fetches a single post by ID with author profile and like status. */
  async getById(postId: string, uid: string): Promise<Post> {
    const snap = await getDoc(doc(db, 'posts', postId));
    if (!snap.exists()) throw new Error('Post not found');
    const post = { ...(snap.data() as Post), id: snap.id };
    await hydrateAuthor(post);
    const likeSnap = await getDoc(doc(db, 'posts', postId, 'likers', uid));
    post.isLiked = likeSnap.exists();
    return post;
  },

  /** Fetches all comments for a post with author profiles and like status. */
  async getComments(postId: string, uid: string): Promise<Comment[]> {
    const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    const comments: Comment[] = [];
    for (const d of snap.docs) {
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
        isLiked: data.likedBy?.includes(uid) ?? false,
        replies: [],
      };
      await hydrateCommentAuthor(comment);
      comments.push(comment);
    }
    return comments;
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
    }
  ): Promise<string> {
    const postRef = doc(collection(db, 'posts'));
    await setDoc(postRef, {
      authorId: author.uid,
      authorUsername: author.username ?? 'Unknown user',
      authorProfileImageUrl: author.profileImageUrl ?? '',
      caption: data.caption ?? '',
      imageUrl: data.imageUrl ?? null,
      createdAt: serverTimestamp(),
      isMilestone: false,
      milestoneDetails: null,
      reactionCount: 0,
      commentCount: 0,
      visibility: data.visibility ?? 'public',
      workoutId: data.workoutId ?? null,
      authorArchetype: data.authorArchetype ?? null,
    });
    return postRef.id;
  },

  /** Updates the imageUrl on a post after a Storage upload completes. */
  async updatePostImageUrl(postId: string, imageUrl: string): Promise<void> {
    await updateDoc(doc(db, 'posts', postId), { imageUrl });
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

    const likerDoc = await getDoc(likerRef);
    if (likerDoc.exists()) return;

    await runTransaction(db, async tx => {
      tx.set(likerRef, { userId: uid, username, profileImageUrl, likedAt: serverTimestamp() });
      tx.update(postRef, { reactionCount: increment(1) });
    });
  },

  /** Atomically removes a like from a post and cleans up activity. */
  async unlikePost(postId: string, uid: string): Promise<void> {
    const postRef = doc(db, 'posts', postId);
    const likerRef = doc(db, 'posts', postId, 'likers', uid);

    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) throw new Error('Post not found');
    const authorId = postSnap.data().authorId as string;

    await runTransaction(db, async tx => {
      tx.delete(likerRef);
      tx.update(postRef, { reactionCount: increment(-1) });
    });

    // Clean up activity record
    if (authorId !== uid) {
      const q = query(
        collection(db, 'activity', authorId, 'userActivity'),
        where('type', '==', 'post_like'),
        where('postId', '==', postId),
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

  /** Adds a comment to a post. Returns the new comment with a client-side timestamp. */
  async addComment(
    postId: string,
    uid: string,
    username: string,
    text: string,
    profileImageUrl: string = ''
  ): Promise<Comment> {
    const ref = await addDoc(collection(db, 'posts', postId, 'comments'), {
      text,
      authorId: uid,
      authorUsername: username,
      createdAt: serverTimestamp(),
      likes: 0,
      likedBy: [],
      replyCount: 0,
    });
    return {
      id: ref.id,
      text,
      authorId: uid,
      authorUsername: username,
      authorProfileImageUrl: profileImageUrl,
      createdAt: Timestamp.now(),
      likes: 0,
      likedBy: [],
      replyCount: 0,
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
    text: string
  ): Promise<Reply> {
    const parentRef = doc(db, 'posts', postId, 'comments', parentCommentId);
    const parentSnap = await getDoc(parentRef);
    if (!parentSnap.exists()) throw new Error('Parent comment not found');
    const parentData = parentSnap.data() as Comment;

    const repliesRef = collection(db, 'posts', postId, 'comments', parentCommentId, 'replies');
    const newReplyRef = doc(repliesRef);

    const replyData = {
      parentCommentId,
      text: text.trim(),
      authorId: author.uid,
      authorUsername: author.username,
      authorProfileImageUrl: author.profileImageUrl ?? '',
      authorProfileThumbnailUrl: author.profileThumbnailUrl ?? '',
      authorBlockedUsers: [],
      createdAt: serverTimestamp(),
      likes: 0,
      likedBy: [],
      replyToUserId: parentData.authorId,
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
};
