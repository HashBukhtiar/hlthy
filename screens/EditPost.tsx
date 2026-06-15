import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePostsData } from '@/hooks/usePostsData';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { TagInput } from '@/components/TagInput';
import {
  SECONDARY_COLOR,
  ErrorMessage,
  CaptionInput,
} from './PostComponents';
import { MentionData } from '@/features/mentions/domain/Mention';

export default function EditPost() {
  const router = useRouter();
  const { id: postId } = useLocalSearchParams<{ id: string }>();
  const { getPostById, updatePost } = usePostsData();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [originalCaption, setOriginalCaption] = useState('');
  const [originalTags, setOriginalTags] = useState<string[]>([]);

  const [caption, setCaption] = useState('');
  const [captionMentions, setCaptionMentions] = useState<MentionData[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [hasMedia, setHasMedia] = useState(false);

  useEffect(() => {
    if (!postId || !currentUser?.uid) return;
    (async () => {
      try {
        const post = await getPostById(postId);
        if (post.authorId !== currentUser?.uid) {
          Alert.alert('Error', 'You can only edit your own posts.');
          router.back();
          return;
        }
        setCaption(post.caption ?? '');
        setCaptionMentions(post.mentions ?? []);
        setTags(post.tags ?? []);
        setOriginalCaption(post.caption ?? '');
        setOriginalTags(post.tags ?? []);
        setHasMedia(!!(post.imageUrl || post.videoUrl));
      } catch {
        Alert.alert('Error', 'Could not load post.');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [postId, currentUser?.uid, router]);

  const hasChanges =
    caption !== originalCaption ||
    JSON.stringify(tags) !== JSON.stringify(originalTags);

  const handleBack = () => {
    if (!hasChanges) {
      router.back();
      return;
    }
    Alert.alert(
      'Discard changes?',
      'Your edits will be lost.',
      [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ],
      { cancelable: false }
    );
  };

  const handleSave = async () => {
    if (!postId) return;
    if (!hasMedia && !caption.trim()) {
      setFormError('Caption cannot be empty.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await updatePost(postId, caption.trim(), tags);
      router.back();
    } catch (err) {
      console.error('Error updating post:', err);
      setFormError('Failed to save changes. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.postPage}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Post</Text>
            <TouchableOpacity
              style={[styles.saveButton, (!hasChanges || isSubmitting) && styles.disabledButton]}
              onPress={handleSave}
              disabled={!hasChanges || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ErrorMessage error={formError} />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <CaptionInput
              caption={caption}
              setCaption={setCaption}
              mentions={captionMentions}
              onMentionsChange={setCaptionMentions}
              onHashtagDetected={(hashtag) => {
                if (!tags.includes(hashtag) && tags.length < 10) {
                  setTags([...tags, hashtag]);
                }
              }}
            />

            <View style={styles.tagsSection}>
              <TagInput tags={tags} onTagsChange={setTags} />
            </View>

            <View style={styles.editNote}>
              <Ionicons name="information-circle-outline" size={14} color="#666" />
              <Text style={styles.editNoteText}>
                Edited posts will show an "edited" label.
              </Text>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postPage: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 5,
    zIndex: 1,
  },
  saveButton: {
    backgroundColor: SECONDARY_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  tagsSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  editNote: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  editNoteText: {
    color: '#666',
    fontSize: 12,
  },
});
