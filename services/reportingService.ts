import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { 
  SubmitReportData, 
  Report, 
  Reporter,
  ReportContentType
} from '@/types/report';

/**
 * Generates a unique report ID based on content type and content ID
 * This ensures reports for the same content are grouped together
 */
const generateReportId = (contentType: ReportContentType, contentId: string): string => {
  return `${contentType}_${contentId}`;
};

/**
 * Check if user has already reported this content
 */
export const hasUserReportedContent = async (
  contentType: ReportContentType,
  contentId: string,
  userId: string
): Promise<boolean> => {
  try {
    const reportId = generateReportId(contentType, contentId);
    const reportRef = doc(db, 'reports', reportId);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return false;
    }
    
    const report = reportSnap.data() as Report;
    return report.reporters.some(reporter => reporter.userId === userId);
  } catch (error) {
    console.error('Error checking if user reported content:', error);
    return false;
  }
};

/**
 * Submit a report for a user, post, or workout
 * Reports are grouped by content - multiple reports on the same content
 * will be added to the same report document
 */
export const submitReport = async (
  reportData: SubmitReportData,
  reporterUserId: string,
  reporterUsername: string
): Promise<{ success: boolean; message: string; isFirstReport: boolean }> => {
  try {
    const reportId = generateReportId(reportData.contentType, reportData.contentId);
    const reportRef = doc(db, 'reports', reportId);
    const reportSnap = await getDoc(reportRef);
    const now = Timestamp.now();
    
    const newReporter: Reporter = {
      userId: reporterUserId,
      username: reporterUsername,
      reason: reportData.reason,
      details: reportData.details,
      reportedAt: now,
    };
    
    if (reportSnap.exists()) {
      // Check if this user has already reported
      const existingReport = reportSnap.data() as Report;
      const hasReported = existingReport.reporters.some(
        reporter => reporter.userId === reporterUserId
      );
      
      if (hasReported) {
        return {
          success: false,
          message: 'You have already reported this content.',
          isFirstReport: false,
        };
      }
      
      // Add to existing report
      await updateDoc(reportRef, {
        reporters: arrayUnion(newReporter),
        reportCount: increment(1),
        lastReportedAt: now,
        // Update status back to pending if it was dismissed (new report on same content)
        ...(existingReport.status === 'dismissed' ? { status: 'pending' } : {}),
      });
      
      return {
        success: true,
        message: 'Report submitted successfully.',
        isFirstReport: false,
      };
    } else {
      // Create new report
      const newReport: Omit<Report, 'id'> = {
        reportedContentType: reportData.contentType,
        reportedContentId: reportData.contentId,
        reportedUserId: reportData.reportedUserId,
        reporters: [newReporter],
        reportCount: 1,
        firstReportedAt: now,
        lastReportedAt: now,
        status: 'pending',
        contentSnapshot: reportData.contentSnapshot,
      };
      
      await setDoc(reportRef, { ...newReport, id: reportId });
      
      return {
        success: true,
        message: 'Report submitted successfully.',
        isFirstReport: true,
      };
    }
  } catch (error) {
    console.error('Error submitting report:', error);
    return {
      success: false,
      message: 'Failed to submit report. Please try again.',
      isFirstReport: false,
    };
  }
};

/**
 * Get report by ID
 */
export const getReportById = async (reportId: string): Promise<Report | null> => {
  try {
    const reportRef = doc(db, 'reports', reportId);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return null;
    }
    
    return { ...reportSnap.data(), id: reportSnap.id } as Report;
  } catch (error) {
    console.error('Error getting report:', error);
    return null;
  }
};

/**
 * Check if a user is suspended or banned
 */
export const checkUserModerationStatus = async (
  userId: string
): Promise<{ isBanned: boolean; isSuspended: boolean; suspendedUntil?: Date }> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return { isBanned: false, isSuspended: false };
    }
    
    const userData = userSnap.data();
    const isBanned = userData.isBanned === true;
    
    let isSuspended = false;
    let suspendedUntil: Date | undefined;
    
    if (userData.suspendedUntil) {
      const suspensionEnd = userData.suspendedUntil.toDate();
      if (suspensionEnd > new Date()) {
        isSuspended = true;
        suspendedUntil = suspensionEnd;
      }
    }
    
    return { isBanned, isSuspended, suspendedUntil };
  } catch (error) {
    console.error('Error checking user moderation status:', error);
    return { isBanned: false, isSuspended: false };
  }
};
