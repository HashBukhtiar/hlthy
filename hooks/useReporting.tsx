import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { 
  submitReport as submitReportService,
  hasUserReportedContent,
} from '@/services/reportingService';
import { 
  SubmitReportData, 
  ReportContentType, 
  ReportReason,
  ContentSnapshot 
} from '@/types/report';

interface UseReportingReturn {
  isSubmitting: boolean;
  submitReport: (
    contentType: ReportContentType,
    contentId: string,
    reportedUserId: string,
    reason: ReportReason,
    details: string | undefined,
    contentSnapshot: ContentSnapshot
  ) => Promise<boolean>;
  checkIfAlreadyReported: (
    contentType: ReportContentType,
    contentId: string
  ) => Promise<boolean>;
}

export function useReporting(): UseReportingReturn {
  const { currentUser, userProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitReport = useCallback(async (
    contentType: ReportContentType,
    contentId: string,
    reportedUserId: string,
    reason: ReportReason,
    details: string | undefined,
    contentSnapshot: ContentSnapshot
  ): Promise<boolean> => {
    if (!currentUser?.uid || !userProfile?.username) {
      Alert.alert('Error', 'You must be logged in to report content.');
      return false;
    }

    // Prevent self-reporting
    if (reportedUserId === currentUser.uid) {
      Alert.alert('Error', 'You cannot report your own content.');
      return false;
    }

    setIsSubmitting(true);

    try {
      const reportData: SubmitReportData = {
        contentType,
        contentId,
        reportedUserId,
        reason,
        details,
        contentSnapshot,
      };

      const result = await submitReportService(
        reportData,
        currentUser.uid,
        userProfile.username
      );

      if (result.success) {
        return true;
      } else {
        Alert.alert('Report', result.message);
        return false;
      }
    } catch (error) {
      console.error('Error in submitReport:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [currentUser, userProfile]);

  const checkIfAlreadyReported = useCallback(async (
    contentType: ReportContentType,
    contentId: string
  ): Promise<boolean> => {
    if (!currentUser?.uid) {
      return false;
    }

    try {
      return await hasUserReportedContent(contentType, contentId, currentUser.uid);
    } catch (error) {
      console.error('Error checking if already reported:', error);
      return false;
    }
  }, [currentUser]);

  return {
    isSubmitting,
    submitReport,
    checkIfAlreadyReported,
  };
}
