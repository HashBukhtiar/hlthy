import { Timestamp } from 'firebase/firestore';

export interface ActivityItem {
  id: string;
  type:
    | 'follow_request'
    | 'new_follower'
    | 'post_like'
    | 'post_comment'
    | 'comment_like'
    | 'reply_like'
    | 'comment_reply'
    | 'workout_save'
    | 'mention'
    | string;
  mentionContext?: 'post_caption' | 'comment' | 'reply' | 'workout_description';
  fromUserId: string;
  fromUsername: string;
  fromProfileImageUrl?: string;
  fromProfileThumbnailUrl?: string;
  postId?: string;
  postImageUrl?: string;
  postThumbnailUrl?: string;
  commentId?: string;
  replyId?: string;
  workoutId?: string;
  workoutTitle?: string;
  workoutThumbnailUrl?: string;
  commentText?: string;
  createdAt: Timestamp;
  isRead: boolean;
  status?: 'pending' | 'accepted' | 'ignored';
}
