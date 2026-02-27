import { Timestamp } from 'firebase/firestore';

export type ReportContentType = 'user' | 'post' | 'workout';

export type ReportReason = 
  | 'spam'
  | 'harassment'
  | 'inappropriate'
  | 'impersonation'
  | 'misinformation'
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';

export type ActionTaken = 
  | 'none'
  | 'warning'
  | 'content_deleted'
  | 'user_suspended_24h'
  | 'user_suspended_7d'
  | 'user_suspended_30d'
  | 'user_banned';

export interface Reporter {
  userId: string;
  username: string;
  reason: ReportReason;
  details?: string;
  reportedAt: Timestamp;
}

export interface ContentSnapshot {
  // For users
  username?: string;
  profileImageUrl?: string;
  
  // For posts
  caption?: string;
  imageUrl?: string;
  authorUsername?: string;
  
  // For workouts
  title?: string;
  creatorUsername?: string;
  coverImageUrl?: string;
}

export interface Report {
  id: string;
  reportedContentType: ReportContentType;
  reportedContentId: string;
  reportedUserId: string; // The user who owns the content/account
  
  // Grouped reports from multiple users
  reporters: Reporter[];
  
  reportCount: number;
  firstReportedAt: Timestamp;
  lastReportedAt: Timestamp;
  
  // Admin handling
  status: ReportStatus;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  actionTaken?: ActionTaken;
  adminNotes?: string;
  
  // Cached content info for quick display
  contentSnapshot: ContentSnapshot;
}

export interface SubmitReportData {
  contentType: ReportContentType;
  contentId: string;
  reportedUserId: string;
  reason: ReportReason;
  details?: string;
  contentSnapshot: ContentSnapshot;
}

// User moderation fields (to be added to UserProfile)
export interface UserModerationFields {
  warnings?: number;
  suspendedUntil?: Timestamp;
  isBanned?: boolean;
  reportedCount?: number;
}

export const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'spam', label: 'Spam', description: 'Unwanted commercial content or repetitive posts' },
  { value: 'harassment', label: 'Harassment or Bullying', description: 'Abusive behavior directed at someone' },
  { value: 'inappropriate', label: 'Inappropriate Content', description: 'Nudity, violence, or other unsuitable content' },
  { value: 'impersonation', label: 'Impersonation', description: 'Pretending to be someone else' },
  { value: 'misinformation', label: 'Misinformation', description: 'False or misleading health/fitness information' },
  { value: 'other', label: 'Other', description: 'Something else not listed above' },
];

export const SUSPENSION_DURATIONS = {
  'user_suspended_24h': 24 * 60 * 60 * 1000, // 24 hours in ms
  'user_suspended_7d': 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  'user_suspended_30d': 30 * 24 * 60 * 60 * 1000, // 30 days in ms
};

export const WARNING_THRESHOLD = 3; // Auto-suspend after 3 warnings
