import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useReporting } from '@/hooks/useReporting';
import { 
  ReportContentType, 
  ReportReason, 
  REPORT_REASONS,
  ContentSnapshot 
} from '@/types/report';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  contentType: ReportContentType;
  contentId: string;
  reportedUserId: string;
  contentSnapshot: ContentSnapshot;
  onReportComplete?: () => void;
  onBlockUser?: () => void;
}

export default function ReportModal({
  visible,
  onClose,
  contentType,
  contentId,
  reportedUserId,
  contentSnapshot,
  onReportComplete,
  onBlockUser,
}: ReportModalProps) {
  const { submitReport, isSubmitting } = useReporting();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [step, setStep] = useState<'reason' | 'details' | 'success'>('reason');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setSelectedReason(null);
      setDetails('');
      setStep('reason');
    }
  }, [visible]);

  const getContentTypeLabel = (): string => {
    switch (contentType) {
      case 'user':
        return 'account';
      case 'post':
        return 'post';
      case 'workout':
        return 'workout';
      default:
        return 'content';
    }
  };

  const handleReasonSelect = (reason: ReportReason) => {
    setSelectedReason(reason);
    // If "other" is selected, show details step
    if (reason === 'other') {
      setStep('details');
    } else {
      // For other reasons, details are optional but we can skip to submission
      setStep('details');
    }
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for your report.');
      return;
    }

    // For "other" reason, require details
    if (selectedReason === 'other' && !details.trim()) {
      Alert.alert('Error', 'Please provide details for your report.');
      return;
    }

    const success = await submitReport(
      contentType,
      contentId,
      reportedUserId,
      selectedReason,
      details.trim() || undefined,
      contentSnapshot
    );

    if (success) {
      setStep('success');
    }
  };

  const handleClose = () => {
    if (step === 'success') {
      onReportComplete?.();
    }
    onClose();
  };

  const handleBlockAndClose = () => {
    onBlockUser?.();
    handleClose();
  };

  const renderReasonStep = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.subtitle}>
        Why are you reporting this {getContentTypeLabel()}?
      </Text>
      
      {REPORT_REASONS.map((reason) => (
        <TouchableOpacity
          key={reason.value}
          style={[
            styles.reasonItem,
            selectedReason === reason.value && styles.reasonItemSelected,
          ]}
          onPress={() => handleReasonSelect(reason.value)}
        >
          <View style={styles.reasonTextContainer}>
            <Text style={styles.reasonLabel}>{reason.label}</Text>
            <Text style={styles.reasonDescription}>{reason.description}</Text>
          </View>
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color="#666" 
          />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderDetailsStep = () => (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.content}
    >
      <View style={styles.selectedReasonBadge}>
        <Text style={styles.selectedReasonText}>
          {REPORT_REASONS.find(r => r.value === selectedReason)?.label}
        </Text>
        <TouchableOpacity onPress={() => setStep('reason')}>
          <Ionicons name="close-circle" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        {selectedReason === 'other' 
          ? 'Please describe the issue (required)'
          : 'Add more details (optional)'
        }
      </Text>
      
      <TextInput
        style={styles.detailsInput}
        placeholder="Describe what happened..."
        placeholderTextColor="#666"
        multiline
        numberOfLines={4}
        value={details}
        onChangeText={setDetails}
        maxLength={500}
      />
      
      <Text style={styles.charCount}>{details.length}/500</Text>

      <TouchableOpacity
        style={[
          styles.submitButton,
          isSubmitting && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Report</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => {
          if (selectedReason !== 'other') {
            handleSubmit();
          }
        }}
        disabled={selectedReason === 'other' || isSubmitting}
      >
        {selectedReason !== 'other' && (
          <Text style={styles.skipButtonText}>Skip details and submit</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );

  const renderSuccessStep = () => (
    <View style={styles.successContent}>
      <View style={styles.successIconContainer}>
        <Ionicons name="checkmark-circle" size={60} color="#34C759" />
      </View>
      
      <Text style={styles.successTitle}>Report Submitted</Text>
      <Text style={styles.successMessage}>
        Thank you for helping keep our community safe. We'll review your report and take appropriate action.
      </Text>

      {onBlockUser && (
        <>
          <Text style={styles.blockPrompt}>
            Would you also like to block this user?
          </Text>
          
          <TouchableOpacity
            style={styles.blockButton}
            onPress={handleBlockAndClose}
          >
            <Ionicons name="ban" size={20} color="#FF3B30" />
            <Text style={styles.blockButtonText}>Block User</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={styles.doneButton}
        onPress={handleClose}
      >
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            {step === 'details' && (
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setStep('reason')}
              >
                <Ionicons name="arrow-back" size={24} color="#FFF" />
              </TouchableOpacity>
            )}
            <Text style={styles.title}>
              {step === 'success' ? 'Report Submitted' : `Report ${getContentTypeLabel()}`}
            </Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleClose}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Content based on step */}
          {step === 'reason' && renderReasonStep()}
          {step === 'details' && renderDetailsStep()}
          {step === 'success' && renderSuccessStep()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    position: 'absolute',
    left: 20,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    textTransform: 'capitalize',
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 20,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    marginBottom: 10,
  },
  reasonItemSelected: {
    backgroundColor: '#3A3A3C',
    borderColor: '#0A84FF',
    borderWidth: 1,
  },
  reasonTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  reasonDescription: {
    fontSize: 13,
    color: '#999',
  },
  selectedReasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C2E',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  selectedReasonText: {
    fontSize: 14,
    color: '#FFF',
    marginRight: 8,
  },
  detailsInput: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFF',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#0A84FF',
  },
  successContent: {
    padding: 30,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  blockPrompt: {
    fontSize: 15,
    color: '#FFF',
    marginBottom: 16,
  },
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  blockButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
  doneButton: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    width: '100%',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
