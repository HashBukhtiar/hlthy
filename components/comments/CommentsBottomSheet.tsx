import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, useWindowDimensions, Platform,
  KeyboardAvoidingView, TouchableWithoutFeedback,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, runOnJS, Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBlockEnforcement } from '@/utils/blockUtils';
import { Post } from '@/hooks/usePostsData';
import CommentsThread from './CommentsThread';

/** "1234" → "1.2K", "1500000" → "1.5M". */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 >= 100_000 ? 1 : 0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 >= 100 ? 1 : 0)}K`;
  return `${n}`;
}

interface CommentsBottomSheetProps {
  post: Post | null;
  visible: boolean;
  onClose: () => void;
  /** Called when a comment is added/removed so the feed card can update its count. */
  onCommentCountChange?: (postId: string, delta: number) => void;
}

export default function CommentsBottomSheet({ post, visible, onClose, onCommentCountChange }: CommentsBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { canInteractWithUser } = useBlockEnforcement();

  const sheetHeight = Math.round(height * 0.9);
  const translateY = useSharedValue(sheetHeight);
  const backdrop = useSharedValue(0);
  const [mounted, setMounted] = useState(false);

  // Local mirror of the count so the header updates live as comments are added.
  const [count, setCount] = useState(0);
  useEffect(() => { setCount(post?.commentCount || 0); }, [post?.id, post?.commentCount]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = sheetHeight;
      translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
      backdrop.value = withTiming(1, { duration: 200 });
    } else if (mounted) {
      backdrop.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(sheetHeight, { duration: 220 }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  // Pan on the header/handle only, so the comment list scrolls independently.
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 800) {
        runOnJS(onClose)();
      } else {
        translateY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
      }
    });

  if (!mounted || !post) return null;

  const canInteractWithAuthor = canInteractWithUser(post.authorId, post.authorBlockedUsers);

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.sheet, { height: sheetHeight, paddingBottom: 0 }, sheetStyle]}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <GestureDetector gesture={pan}>
              <View style={styles.header}>
                <View style={styles.grabber} />
                <Text style={styles.headerTitle}>Comments ({formatCount(count)})</Text>
              </View>
            </GestureDetector>

            <CommentsThread
              post={post}
              canInteractWithAuthor={canInteractWithAuthor}
              variant="sheet"
              bottomInset={insets.bottom}
              onCommentCountChange={(delta) => {
                setCount((c) => Math.max(0, c + delta));
                onCommentCountChange?.(post.id, delta);
              }}
            />
          </KeyboardAvoidingView>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#000',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#3A3A3C',
    marginBottom: 10,
  },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
