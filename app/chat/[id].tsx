import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ListRenderItem,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Alert,
  Modal,
  Animated,
  Share,
  Clipboard,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { db } from '@/firebaseConfig';
import { 
  doc, 
  getDoc,
  setDoc,
  startAfter, 
  collection, 
  addDoc,
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  limit,
  QueryDocumentSnapshot,
} from '@/features/infra/firestore';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { sendMessage, sendMessageWithIntent, IntentClassificationResult, AIResponse } from '@/ai/ai_chat';
import { SmartChatInput } from '@/components/SmartChatInput';
import { IntentMessageWrapper } from '@/components/IntentBadge';
import { MessageRenderer } from '@/components/ai/MessageRenderer';
import { calculateImprovementPercentage } from '@/logic/milestoneUtils';
import { uploadPhotoToChat, deletePhotoFromChat, formatFileSize } from '@/utils/photoSharingUtils';
import { useUnits } from '@/hooks/useUnits';
import { getOptimalImageUrl } from '@/utils/imageUtils';

interface FirestoreMessageData {
  senderId: string;
  text: string;
  createdAt: Timestamp;
  isAiResponse?: boolean; // Flag to identify AI responses
  intent?: string; // Add intent field
  workoutPlan?: any; // Add workout plan data
  responseType?: string; // Add response type
  profileData?: any; // Add profile data for workout_confirmation
  sharedPost?: {
    id: string;
    imageUrl: string | null;
    thumbnailUrl?: string | null;
    caption: string;
    authorUsername: string;
  };
  sharedMilestone?: {
    id: string;
    type: string;
    details: {
      exercise?: string;
      value?: number;
      weightUnit?: string;
      reps?: number;
      previousValue?: number;
      previousReps?: number;
      improvement?: string;
      newWeight?: number;
      newWeightUnit?: string;
      previousWeight?: number;
      totalLoss?: number;
      percentageLoss?: string;
    };
    username: string;
  };
  sharedWorkout?: {
    id: string;
    title: string;
    coverImageUrl?: string;
    thumbnailUrl?: string | null;
    creatorUsername: string;
  };
  sharedPhoto?: {
    id: string;
    imageUrl: string;
    thumbnailUrl?: string;
    originalFileSize?: number;
    compressedFileSize?: number;
  };
}

interface Message {
  id: string;
  text: string;
  user: 'user' | 'other' | 'ai';
  role: 'user' | 'model';
  createdAt?: Date;
  profileData?: any; // Profile confirmation data
  responseType?: string; // Type of AI response  
  intent?: string; // Add intent field
  workoutPlan?: any; // Add workout plan data
  sharedPost?: {
    id: string;
    imageUrl: string | null;
    thumbnailUrl?: string | null;
    caption: string;
    authorUsername: string;
    isAvailable?: boolean;
  };
  sharedMilestone?: {
    id: string;
    type: string;
    details: {
      exerciseName?: string;
      value?: number;
      weightUnit?: string;
      reps?: number;
      previousValue?: number;
      previousReps?: number;
      improvement?: string;
      newWeight?: number;
      newWeightUnit?: string;
      previousWeight?: number;
      totalLoss?: number;
      percentageLoss?: string;
    };
    username: string;
    isAvailable?: boolean;
  };
  sharedWorkout?: {
    id: string;
    title: string;
    coverImageUrl?: string;
    thumbnailUrl?: string | null;
    creatorUsername: string;
    isAvailable?: boolean;
  };
  sharedPhoto?: {
    id: string;
    imageUrl: string;
    thumbnailUrl?: string;
    originalFileSize?: number;
    compressedFileSize?: number;
  };
  type?: 'message' | 'dateHeader';
}

async function convertFirestoreDoc(
  docSnap: QueryDocumentSnapshot,
  myUid: string
): Promise<Message> {
  const data = docSnap.data() as FirestoreMessageData;
  const messageDate = data.createdAt?.toDate();

  let resolvedSharedPost = data.sharedPost
    ? { ...data.sharedPost, isAvailable: true }
    : undefined;
  if (data.sharedPost) {
    try {
      const postRef = doc(db, "posts", data.sharedPost.id);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        // Fetch fresh post data to get updated image/thumbnail URLs
        const freshPostData = postSnap.data();
        resolvedSharedPost = {
          ...data.sharedPost,
          imageUrl: freshPostData.imageUrl || data.sharedPost.imageUrl,
          thumbnailUrl: freshPostData.thumbnailUrl || data.sharedPost.thumbnailUrl,
          caption: freshPostData.caption || data.sharedPost.caption,
          isAvailable: true,
        };
      } else {
        resolvedSharedPost = { ...data.sharedPost, isAvailable: false };
      }
    } catch {
      resolvedSharedPost = { ...data.sharedPost, isAvailable: false };
    }
  }

  let resolvedSharedMilestone = data.sharedMilestone
    ? { ...data.sharedMilestone, isAvailable: true }
    : undefined;
  if (data.sharedMilestone) {
    try {
      const milestoneRef = doc(db, "posts", data.sharedMilestone.id);
      const milestoneSnap = await getDoc(milestoneRef);
      resolvedSharedMilestone = {
        ...data.sharedMilestone,
        isAvailable: milestoneSnap.exists(),
      };
    } catch {
      resolvedSharedMilestone = { ...data.sharedMilestone, isAvailable: false };
    }
  }

  let resolvedSharedWorkout = data.sharedWorkout
    ? { ...data.sharedWorkout, isAvailable: true }
    : undefined;
  if (data.sharedWorkout) {
    try {
      const workoutRef = doc(db, "workouts", data.sharedWorkout.id);
      const workoutSnap = await getDoc(workoutRef);
      if (workoutSnap.exists()) {
        // Fetch fresh workout data to get updated cover/thumbnail URLs
        const freshWorkoutData = workoutSnap.data();
        resolvedSharedWorkout = {
          ...data.sharedWorkout,
          coverImageUrl: freshWorkoutData.coverImageUrl || data.sharedWorkout.coverImageUrl,
          thumbnailUrl: freshWorkoutData.thumbnailUrl || data.sharedWorkout.thumbnailUrl,
          title: freshWorkoutData.title || data.sharedWorkout.title,
          isAvailable: true,
        };
      } else {
        resolvedSharedWorkout = { ...data.sharedWorkout, isAvailable: false };
      }
    } catch {
      resolvedSharedWorkout = { ...data.sharedWorkout, isAvailable: false };
    }
  }

  const userType = data.isAiResponse ? 'ai' : (data.senderId === myUid ? "user" : (data.senderId === 'ai_conversation' ? 'ai' : 'other'));
  const roleType = userType === 'user' ? 'user' : 'model';

  return {
    id: docSnap.id,
    text: data.text,
    user: userType,
    role: roleType,
    createdAt: messageDate,
    intent: data.intent, // Include intent data
    workoutPlan: data.workoutPlan, // Include workout plan data
    responseType: data.responseType, // Include response type
    profileData: data.profileData, // Include profile data for workout_confirmation
    sharedPost: resolvedSharedPost,
    sharedMilestone: resolvedSharedMilestone,
    sharedWorkout: resolvedSharedWorkout,
    sharedPhoto: data.sharedPhoto, // Include photo data
    type: "message",
  };
}


const MessageItem = React.memo<{ 
  item: Message; 
  onLongPress: (m: Message) => void; 
  conversationId: string; 
  onReprompt?: (message: string) => void; 
  onSendMessage?: (message: string) => void;
  onConfirmProfile?: (preferences: any) => void;
  onEditWorkout?: (workout: any) => void;
  onSwipeActiveChange?: (active: boolean) => void;
  onViewPhoto?: (photo: { imageUrl: string; fileSize?: number }) => void;
}>(
  ({ item, onLongPress, conversationId, onReprompt, onSendMessage, onConfirmProfile, onEditWorkout, onSwipeActiveChange, onViewPhoto }) => {
    const router = useRouter();
    const { getWeightUnit, getDistanceUnit, convertWeight, convertDistance } = useUnits();
    
    // Helper function to convert and format value with proper units
    const convertAndFormatValue = (value: number, storedUnit: string) => {
      if (storedUnit === 'kg' || storedUnit === 'lbs') {
        const userPreferredUnit = getWeightUnit() as 'kg' | 'lbs';
        const convertedValue = storedUnit !== userPreferredUnit 
          ? convertWeight(value, storedUnit as 'kg' | 'lbs', userPreferredUnit)
          : value;
        return {
          value: Math.round(convertedValue * 10) / 10,
          unit: userPreferredUnit
        };
      } else if (storedUnit === 'km' || storedUnit === 'miles') {
        const userPreferredUnit = getDistanceUnit() as 'km' | 'miles';
        const convertedValue = storedUnit !== userPreferredUnit 
          ? convertDistance(value, storedUnit as 'km' | 'miles', userPreferredUnit)
          : value;
        return {
          value: Math.round(convertedValue * 10) / 10,
          unit: userPreferredUnit
        };
      }
      return { value, unit: storedUnit };
    };
    
    if (item.type === 'dateHeader') {
      return (
        <View style={styles.dateHeaderContainer}>
          <Text style={styles.dateHeaderText}>{item.text}</Text>
        </View>
      );
    }
    if (item.sharedPost) {
      if (item.sharedPost.isAvailable === false) {
        return (
            <View style={[styles.messageBubble, item.user === 'user' ? styles.currentUserMessage : styles.otherUserMessage, styles.unavailableItemBubble]}>
              <Ionicons name="share-social-outline" size={16} color="#FFF" style={{ marginRight: 5 }} />
              <Text style={ item.user === 'user' ? styles.currentUserText : styles.otherUserText }>Post unavailable</Text>
            </View>
        );
      }
      return (
        <TouchableOpacity
          style={[
            styles.sharedPostContainer,
            item.user === 'user' ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }
          ]}
          onPress={() => item.sharedPost?.id && router.push(`/view-post/${item.sharedPost.id}`)}
          onLongPress={() => onLongPress(item)}
          delayLongPress={500}
          activeOpacity={0.8}
        >
          <View style={styles.sharedPostHeader}>
            <Ionicons name="share-social-outline" size={16} color="#FFF" style={{ marginRight: 5 }} />
            <Text style={styles.sharedPostHeaderText}>
              Shared Post by {item.sharedPost.authorUsername}
            </Text>
          </View>
          {item.sharedPost.imageUrl && (
            <Image 
              source={{ uri: getOptimalImageUrl(item.sharedPost.thumbnailUrl, item.sharedPost.imageUrl) || undefined }} 
              style={styles.sharedPostImage} 
            />
          )}
          {item.sharedPost.caption && (
            <Text style={styles.sharedPostCaption} numberOfLines={2}>
              {item.sharedPost.caption}
            </Text>
          )}
        </TouchableOpacity>
      );
    }

    if (item.sharedMilestone) {
      if (item.sharedMilestone.isAvailable === false) {
        return (
          <View style={[styles.messageBubble, item.user === 'user' ? styles.currentUserMessage : styles.otherUserMessage, styles.unavailableItemBubble]}>
            <Ionicons name="share-social-outline" size={16} color="#FFF" style={{ marginRight: 5 }} />
            <Text style={ item.user === 'user' ? styles.currentUserText : styles.otherUserText }>Milestone unavailable</Text>
          </View>
        );
      }
      return (
        <TouchableOpacity
          style={[
            styles.sharedMilestoneContainer,
            item.user === 'user' ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }
          ]}
          onPress={() => item.sharedMilestone?.id && router.push(`/view-milestone/${item.sharedMilestone.id}`)}
          onLongPress={() => onLongPress(item)}
          delayLongPress={500}
          activeOpacity={0.8}
        >
          <View style={styles.sharedMilestoneHeader}>
            <Ionicons name="trophy-outline" size={16} color="#FFF" style={{ marginRight: 5 }} />
            <Text style={styles.sharedMilestoneHeaderText}>
              Milestone by {item.sharedMilestone.username}
            </Text>
          </View>
          {item.sharedMilestone.type === 'PR' ? (
            <View style={styles.sharedMilestoneContent}>
              <Text style={styles.sharedMilestoneType}>
                {item.sharedMilestone.details.exerciseName}
              </Text>
              <View style={styles.milestoneStatsRow}>
                <Text style={styles.milestoneValue}>
                  {item.sharedMilestone.details.value && item.sharedMilestone.details.weightUnit
                    ? (() => {
                        const converted = convertAndFormatValue(item.sharedMilestone.details.value, item.sharedMilestone.details.weightUnit);
                        return `${converted.value} ${converted.unit}`;
                      })()
                    : `${item.sharedMilestone.details.value}${item.sharedMilestone.details.weightUnit || 'lbs'}`
                  }
                  {item.sharedMilestone.details.reps != null && item.sharedMilestone.details.reps > 1 && ` × ${item.sharedMilestone.details.reps}`}
                </Text>
                {item.sharedMilestone.details.previousValue != null && (
                  <Text style={styles.milestonePrevious}>
                    from {item.sharedMilestone.details.previousValue && item.sharedMilestone.details.weightUnit
                      ? (() => {
                          const converted = convertAndFormatValue(item.sharedMilestone.details.previousValue, item.sharedMilestone.details.weightUnit);
                          return `${converted.value} ${converted.unit}`;
                        })()
                      : `${item.sharedMilestone.details.previousValue}${item.sharedMilestone.details.weightUnit || 'lbs'}`
                    }
                    {item.sharedMilestone.details.previousReps != null && item.sharedMilestone.details.previousReps > 1 && ` × ${item.sharedMilestone.details.previousReps}`}
                  </Text>
                )}
                {(() => {
                  const improvement = calculateImprovementPercentage(
                    item.sharedMilestone.details.value,
                    item.sharedMilestone.details.previousValue
                  );
                  if (improvement && improvement > 0) {
                    return (
                      <Text style={styles.milestoneImprovement}>
                        ↑ {improvement}%
                      </Text>
                    );
                  }
                  return null;
                })()}
              </View>
            </View>
          ) : (
            <View style={styles.weightMilestoneContent}>
              <Text style={styles.sharedMilestoneType}>
                {item.sharedMilestone.type === 'weightLoss' ? 'Weight Loss' : 'Weight Gain'}
              </Text>
              <Text style={styles.weightChangeValue}>
                {item.sharedMilestone.type === 'weightLoss' ? '↓' : '↑'} 
                {item.sharedMilestone.details.totalLoss && item.sharedMilestone.details.newWeightUnit
                  ? (() => {
                      const converted = convertAndFormatValue(item.sharedMilestone.details.totalLoss, item.sharedMilestone.details.newWeightUnit);
                      return `${converted.value} ${converted.unit}`;
                    })()
                  : `${item.sharedMilestone.details.totalLoss} ${item.sharedMilestone.details.newWeightUnit || getWeightUnit()}`
                }
              </Text>
              <Text style={styles.weightChangeDetails}>
                {item.sharedMilestone.details.previousWeight && item.sharedMilestone.details.newWeightUnit
                  ? (() => {
                      const convertedPrevious = convertAndFormatValue(item.sharedMilestone.details.previousWeight, item.sharedMilestone.details.newWeightUnit);
                      return convertedPrevious.value;
                    })()
                  : item.sharedMilestone.details.previousWeight
                } → {item.sharedMilestone.details.newWeight && item.sharedMilestone.details.newWeightUnit
                  ? (() => {
                      const convertedNew = convertAndFormatValue(item.sharedMilestone.details.newWeight, item.sharedMilestone.details.newWeightUnit);
                      return `${convertedNew.value} ${convertedNew.unit}`;
                    })()
                  : `${item.sharedMilestone.details.newWeight} ${item.sharedMilestone.details.newWeightUnit || getWeightUnit()}`
                }
              </Text>
              <Text style={styles.milestoneImprovement}>
                {item.sharedMilestone.details.percentageLoss} change
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    if (item.sharedWorkout) {
      if (item.sharedWorkout.isAvailable === false) {
        return (
            <View style={[styles.messageBubble, item.user === 'user' ? styles.currentUserMessage : styles.otherUserMessage, styles.unavailableItemBubble]}>
              <Ionicons name="share-social-outline" size={16} color="#FFF" style={{ marginRight: 5 }} />
              <Text style={ item.user === 'user' ? styles.currentUserText : styles.otherUserText }>Workout unavailable</Text>
            </View>
        );
      }
      return (
        <TouchableOpacity
          style={[
            styles.sharedWorkoutContainer,
            item.user === 'user' ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }
          ]}
          onPress={() => item.sharedWorkout?.id && router.push(`/view-workout/${item.sharedWorkout.id}`)}
          onLongPress={() => onLongPress(item)}
          delayLongPress={500}
          activeOpacity={0.8}
        >
          <View style={styles.sharedWorkoutHeader}>
            <Ionicons name="share-social-outline" size={16} color="#FFF" style={{ marginRight: 5 }} />
            <Text style={styles.sharedWorkoutHeaderText}>
              Shared Workout by {item.sharedWorkout.creatorUsername}
            </Text>
          </View>
          {item.sharedWorkout.coverImageUrl && (

            <Image
              source={{
                uri: getOptimalImageUrl(
                  item.sharedWorkout.thumbnailUrl,
                  item.sharedWorkout.coverImageUrl
                ) || undefined
              }}
              style={styles.sharedWorkoutImage}
            />
          )}
          <Text style={styles.sharedWorkoutTitle} numberOfLines={2}>
            {item.sharedWorkout.title}
          </Text>
        </TouchableOpacity>
      );
    }

    if (item.sharedPhoto) {
      return (
        <TouchableOpacity
          style={[
            styles.sharedPhotoContainer,
            item.user === 'user' ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }
          ]}
          onPress={() => onViewPhoto?.({
            imageUrl: item.sharedPhoto!.imageUrl,
            fileSize: item.sharedPhoto!.compressedFileSize ?? item.sharedPhoto!.originalFileSize
          })}
          onLongPress={() => onLongPress(item)}
          delayLongPress={500}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: getOptimalImageUrl(item.sharedPhoto.thumbnailUrl, item.sharedPhoto.imageUrl) || undefined }}
            style={styles.sharedPhotoImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      );
    }

    return (
      <IntentMessageWrapper 
        intent={item.intent} 
        isUserMessage={item.user === 'user'} 
        showIntentBadge={!!item.intent}
      >
        {item.user === 'ai' ? (
          <MessageRenderer
            message={item.text}
            intent={item.intent}
            workoutPlan={item.workoutPlan}
            responseType={item.responseType}
            profileData={item.profileData}
            onFormatAgain={() => onReprompt?.(item.text)}
            onConfirmProfile={onConfirmProfile}
            onEditProfile={() => onSendMessage?.('no')}
            onEditWorkout={onEditWorkout}
            onSwipeActiveChange={onSwipeActiveChange}
          />
        ) : (
          <TouchableOpacity
            style={[
              styles.messageBubble,
              item.user === 'user'
                ? styles.currentUserMessage
                : styles.otherUserMessage,
            ]}
            onLongPress={() => onLongPress(item)}
            delayLongPress={500}
            activeOpacity={0.7}
          >
            <Text
              style={
                item.user === 'user'
                  ? styles.currentUserText
                  : styles.otherUserText
              }
            >
              {item.text}
            </Text>
          </TouchableOpacity>
        )}
      </IntentMessageWrapper>
    );
  },
  (prev, next) => {
    return (
      prev.item.id === next.item.id &&
      prev.item.text === next.item.text &&
      prev.item.sharedPost?.isAvailable === next.item.sharedPost?.isAvailable &&
      prev.item.sharedPost?.thumbnailUrl === next.item.sharedPost?.thumbnailUrl &&
      prev.item.sharedMilestone?.isAvailable === next.item.sharedMilestone?.isAvailable &&
      prev.item.sharedWorkout?.isAvailable === next.item.sharedWorkout?.isAvailable &&
      prev.item.sharedWorkout?.thumbnailUrl === next.item.sharedWorkout?.thumbnailUrl &&
      prev.item.sharedPhoto?.imageUrl === next.item.sharedPhoto?.imageUrl
    );
  }
);

function addDateHeaders(msgs: Message[]): Message[] {
  const out: Message[] = [];
  if (!msgs || msgs.length === 0) {
    return out;
  }

  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return msgs.reduce((acc: Message[], message, index) => {
    acc.push(message);

    const currentMessageDate = message.createdAt;
    const nextMessageDate = msgs[index + 1]?.createdAt;
    
    const currentDateString = currentMessageDate?.toLocaleDateString(undefined, dateOptions);
    const nextDateString = nextMessageDate?.toLocaleDateString(undefined, dateOptions);

    // Add a header if this is the last message OR if the next message is on a different day.
    if (currentDateString && (index === msgs.length - 1 || currentDateString !== nextDateString)) {
      acc.push({
        id: `date-${currentDateString}`,
        text: currentDateString,
        type: 'dateHeader',
        user: 'other',
        role: 'model',
        createdAt: currentMessageDate,
      });
    }

    return acc;
  }, []);
}

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id as string;
  const { currentUser, userProfile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList | null>(null);
  const [chatTitle, setChatTitle] = useState<string>('');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [otherParticipantId, setOtherParticipantId] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<any>(null);
  const [workoutPreferences, setWorkoutPreferences] = useState<any>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true); // Control scroll locking
  const [photoUploadProgress, setPhotoUploadProgress] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<{ imageUrl: string; fileSize?: number } | null>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const thinkingDotAnimations = useRef([
    new Animated.Value(0.4),
    new Animated.Value(0.4),
    new Animated.Value(0.4),
  ]).current;
  
  const BATCH_SIZE = 20; // number of messages to fetch at a time
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  // Animate thinking dots when AI is thinking
  useEffect(() => {
    if (isAiThinking) {
      const animations = thinkingDotAnimations.map((anim, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 150),
            Animated.timing(anim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 0.4,
              duration: 500,
              useNativeDriver: false,
            }),
          ])
        )
      );
      
      animations.forEach(anim => anim.start());
      
      return () => {
        animations.forEach(anim => anim.stop());
        thinkingDotAnimations.forEach(anim => anim.setValue(0.4));
      };
    }
  }, [isAiThinking]);

  useEffect(() => {
    if (!currentUser || !conversationId) {
      setLoading(false); 
      setHasMoreMessages(false);
      return;
    }

    const messagesRef = collection(db, "conversations", conversationId, "messages");

    const initialQ = query(
      messagesRef,
      orderBy("createdAt", "desc"),
      limit(BATCH_SIZE)
    );

    const unsubscribe = onSnapshot(initialQ, async snapshot => {
      const docs = snapshot.docs;
      if (docs.length > 0) {
        setLastVisible(docs[docs.length - 1]);
        const page = await Promise.all(docs.map(d => convertFirestoreDoc(d, currentUser.uid)));
        setMessages(page);
        if (docs.length < BATCH_SIZE) {
          setHasMoreMessages(false);
        } else {
          setHasMoreMessages(true);
        }
      } else {
        setMessages([]);
        setHasMoreMessages(false);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching initial messages:", error);
      setLoading(false);
      setHasMoreMessages(false);
    });

    return () => unsubscribe();
  }, [currentUser, conversationId]);

  const fetchMore = useCallback(async () => {
    console.log("Attempting to fetch more messages...");
    if (loadingMore || !lastVisible || !hasMoreMessages || !currentUser || !conversationId) { 
      if (!hasMoreMessages) {
        console.log("Fetch more skipped: No more messages to load.");
      }
      if (loadingMore) {
        console.log("Fetch more skipped: Already loading more.");
      }
      if (!lastVisible) {
        console.log("Fetch more skipped: lastVisible is null.");
      }
      return;
    }
    console.log("Proceeding to fetch more messages from Firestore."); 
    setLoadingMore(true);

    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const nextQ = query(
      messagesRef,
      orderBy("createdAt", "desc"),
      startAfter(lastVisible),
      limit(BATCH_SIZE)
    );

    try {
      const snap = await getDocs(nextQ);
      if (!snap.empty) {
        const docs = snap.docs;
        setLastVisible(docs[docs.length - 1]);

        const more = await Promise.all(docs.map(d => convertFirestoreDoc(d, currentUser.uid)));
        setMessages(prev => [...prev, ...more]);
        if (docs.length < BATCH_SIZE) {
          setHasMoreMessages(false);
        }
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error("Error fetching more messages:", error);
      // Optionally setHasMoreMessages(false) here or handle error appropriately
    } finally {
      setLoadingMore(false);
    }
  }, [lastVisible, loadingMore, conversationId, currentUser, hasMoreMessages]);

  const initialScrollRef = useRef(true);

  useEffect(() => {
    if (!loading && initialScrollRef.current) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      initialScrollRef.current = false;
    }
  }, [loading]);

  useEffect(() => {
    const isAiChat = conversationId.endsWith('_ai_conversation');
    if (isAiChat) {
      setChatTitle('AI Assistant');
      setProfileImageUrl(null); // Or a specific AI avatar if you have one
      return;
    }

    if (!currentUser || !conversationId) return;
    
    const fetchHeaderData = async () => {
      const convRef = doc(db, "conversations", conversationId);
      const convSnap = await getDoc(convRef);

      if (!convSnap.exists()) return;

      const data = convSnap.data();
      const otherId = data.participants?.find((uid: string) => uid !== currentUser.uid);

      if (!otherId) return;

      setOtherParticipantId(otherId);
      setChatTitle(data.participantUsernames?.[otherId] || 'Chat');

      // Fetch the user document for the latest profile image
      try {
        const userRef = doc(db, 'users', otherId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          // Use getOptimalImageUrl to handle thumbnails if they exist
          const optimalImageUrl = getOptimalImageUrl(userData.profileThumbnailUrl, userData.profileImageUrl);
          setProfileImageUrl(optimalImageUrl);
        } else {
          // Fallback to the potentially outdated image if the user doc is not found
          setProfileImageUrl(data.participantProfileImages?.[otherId] || null);
        }
      } catch (error) {
        console.error("Error fetching user profile for chat header:", error);
        setProfileImageUrl(data.participantProfileImages?.[otherId] || null);
      }
    };

    fetchHeaderData();
  }, [currentUser, conversationId]);

  const updateConversationMetadata = async (conversationId: string, senderId: string, messageText: string) => {
    if (!currentUser || !otherParticipantId) return;
    
    try {
      const conversationRef = doc(db, "conversations", conversationId);
      
      // Update main conversation document
      await updateDoc(conversationRef, {
        lastMessageAt: serverTimestamp(),
        lastMessageText: messageText,
        lastMessageSenderId: senderId,
      });

      // Update user conversation references for both participants
      const userConvRef1 = doc(db, `users/${senderId}/conversations`, conversationId);
      await setDoc(userConvRef1, {
        otherParticipantId: otherParticipantId,
        otherParticipantUsername: chatTitle,
        otherParticipantProfileImage: profileImageUrl || '',
        otherParticipantThumbnailUrl: profileImageUrl || '', // Add thumbnail support
        lastMessageAt: serverTimestamp(),
        lastMessageText: messageText,
      }, { merge: true });

      const userConvRef2 = doc(db, `users/${otherParticipantId}/conversations`, conversationId);
      await setDoc(userConvRef2, {
        otherParticipantId: senderId,
        otherParticipantUsername: currentUser.displayName || currentUser.email || 'User',
        otherParticipantProfileImage: currentUser.photoURL || '',
        otherParticipantThumbnailUrl: currentUser.photoURL || '', // Add thumbnail support
        lastMessageAt: serverTimestamp(),
        lastMessageText: messageText,
      }, { merge: true });

    } catch (error) {
      console.error('Error updating conversation metadata:', error);
      // Don't throw error - this is not critical for message sending
    }
  };

  const handlePhotoSelect = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Camera roll access is needed to share photos.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7, 
        exif: false,
      });

      if (result.canceled) {
        return;
      }

      const selectedAsset = result.assets[0];
      if (!selectedAsset.uri) {
        Alert.alert('Error', 'Failed to get image URI');
        return;
      }

      // Upload photo
      setPhotoUploadProgress(true);
      try {
        console.log('Starting photo upload...');
        const sharedPhoto = await uploadPhotoToChat(
          selectedAsset.uri,
          conversationId,
          currentUser!.uid
        );

        // Send message with photo
        const messagesRef = collection(db, "conversations", conversationId, "messages");
        const messageData: any = {
          senderId: currentUser!.uid,
          text: '',
          createdAt: serverTimestamp(),
          sharedPhoto: {
            id: sharedPhoto.id,
            imageUrl: sharedPhoto.imageUrl,
            thumbnailUrl: sharedPhoto.thumbnailUrl,
            originalFileSize: sharedPhoto.originalFileSize,
            compressedFileSize: sharedPhoto.compressedFileSize,
          },
        };

        await addDoc(messagesRef, messageData);

        // Update conversation metadata with empty text but photo
        await updateConversationMetadata(
          conversationId,
          currentUser!.uid,
          '📷 Photo'
        );

        console.log('Photo sent successfully');
      } catch (uploadError) {
        console.error('Error uploading photo:', uploadError);
        Alert.alert('Upload Failed', 'Failed to upload photo. Please try again.');
      } finally {
        setPhotoUploadProgress(false);
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const handlePhotoCapture = async () => {
    try {
      // Request camera permission
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Camera access is needed to take photos.');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7, // Balanced quality to reduce upload size
        exif: false,
      });

      if (result.canceled) {
        return;
      }

      const selectedAsset = result.assets[0];
      if (!selectedAsset.uri) {
        Alert.alert('Error', 'Failed to get image URI');
        return;
      }

      // Upload photo (same as library)
      setPhotoUploadProgress(true);
      try {
        console.log('Starting photo upload from camera...');
        const sharedPhoto = await uploadPhotoToChat(
          selectedAsset.uri,
          conversationId,
          currentUser!.uid
        );

        // Send message with photo
        const messagesRef = collection(db, "conversations", conversationId, "messages");
        const messageData: any = {
          senderId: currentUser!.uid,
          text: '',
          createdAt: serverTimestamp(),
          sharedPhoto: {
            id: sharedPhoto.id,
            imageUrl: sharedPhoto.imageUrl,
            thumbnailUrl: sharedPhoto.thumbnailUrl,
            originalFileSize: sharedPhoto.originalFileSize,
            compressedFileSize: sharedPhoto.compressedFileSize,
          },
        };

        await addDoc(messagesRef, messageData);

        // Update conversation metadata
        await updateConversationMetadata(
          conversationId,
          currentUser!.uid,
          '📷 Photo'
        );

        console.log('Photo from camera sent successfully');
      } catch (uploadError) {
        console.error('Error uploading photo from camera:', uploadError);
        Alert.alert('Upload Failed', 'Failed to upload photo. Please try again.');
      } finally {
        setPhotoUploadProgress(false);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const handleSend = async (textToSend: string, preferencesOverride?: any, intentResult?: IntentClassificationResult) => {
    Keyboard.dismiss();
    
    if (!textToSend.trim() || !currentUser || !conversationId) {
      return;
    }

    setInput('');
    const isAiChat = conversationId.endsWith('_ai_conversation');
    
    try {
      // Ensure conversation document exists for AI chats
      if (isAiChat) {
        const conversationRef = doc(db, "conversations", conversationId);
        const conversationSnap = await getDoc(conversationRef);
        
        if (!conversationSnap.exists()) {
          const conversationData = {
            participants: [currentUser.uid, 'ai_conversation'],
            participantUsernames: {
              [currentUser.uid]: currentUser.displayName || currentUser.email,
              'ai_conversation': 'AI Assistant'
            },
            participantProfileImages: {
              [currentUser.uid]: currentUser.photoURL || null,
              'ai_conversation': null
            },
            createdAt: serverTimestamp(),
            lastMessageAt: serverTimestamp(),
            lastMessageText: textToSend,
            lastMessageSenderId: currentUser.uid,
          };
          await setDoc(conversationRef, conversationData);
        }
      }

      const messagesRef = collection(db, "conversations", conversationId, "messages");

      // Add user's message to Firestore
      const messageData: any = {
        text: textToSend,
        createdAt: serverTimestamp(),
        senderId: currentUser.uid,
        senderUsername: userProfile?.username || currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
      };
      
      if (intentResult?.intent) {
        messageData.intent = intentResult.intent;
      }
      
      await addDoc(messagesRef, messageData);
      console.log("User message added successfully");

      if (isAiChat) {
        setIsAiThinking(true); // Show thinking indicator
        try {
          // The `messages` state is ordered descending. We need ascending for the API.
          const historyForAPI = [...messages]
            .reverse() // Create a reversed copy
            .map(m => ({ text: m.text, role: m.role }));

          // Add the new user message to the history for the API call
          historyForAPI.push({ text: textToSend, role: 'user' });

          // Build options object with workout preferences and editing context
          const messageOptions: any = {};
          
          // Use preferencesOverride if provided (for immediate profile confirmation)
          // Otherwise use state value (for subsequent messages)
          const currentPreferences = preferencesOverride || workoutPreferences;
          
          if (currentPreferences) {
            messageOptions.workoutPreferences = currentPreferences;
          }
          
          if (editingWorkout) {
            messageOptions.editingWorkout = editingWorkout;
          }

          // Use the enhanced sendMessage function
          const aiResponse = await sendMessage(
            historyForAPI, 
            textToSend, 
            currentUser.uid,
            Object.keys(messageOptions).length > 0 ? messageOptions : undefined
          );

        // Save AI's response to Firestore using current user's ID with isAiResponse flag
        const aiMessageData: any = {
          text: aiResponse.text,
          createdAt: serverTimestamp(),
          senderId: currentUser.uid, // Use current user's ID to avoid permission issues
          isAiResponse: true, // Flag to identify this as an AI response
        };
        
        // Add workout plan data if present
        if (aiResponse.workoutPlan) {
          aiMessageData.workoutPlan = aiResponse.workoutPlan;
          aiMessageData.responseType = aiResponse.type;
        }
        
        // Add profile data for workout confirmation
        if (aiResponse.profile && aiResponse.type === 'workout_confirmation') {
          console.log('🎯 Detected workout_confirmation with profile data:', aiResponse.profile);
          aiMessageData.profileData = aiResponse.profile;
          aiMessageData.responseType = aiResponse.type;
        }
        
        // Add responseType if present (for other response types)
        if (aiResponse.type && !aiMessageData.responseType) {
          aiMessageData.responseType = aiResponse.type;
        }
        
        console.log('💾 Saving message to Firebase:', {
          hasProfileData: !!aiMessageData.profileData,
          responseType: aiMessageData.responseType,
          type: aiResponse.type
        });
        
        // Only add intent field if intentResult exists and has intent property
        if (intentResult?.intent) {
          aiMessageData.intent = intentResult.intent;
        }
        
        await addDoc(messagesRef, aiMessageData);
        
        // Clear editing state after successful response
        if (editingWorkout) {
          setEditingWorkout(null);
        }
      } catch (error) {
        console.error('Error sending message to AI:', error);
        // Add an error message to the chat
        await addDoc(messagesRef, {
          text: "Sorry, I'm having trouble connecting. Please try again later.",
          createdAt: serverTimestamp(),
          senderId: currentUser.uid,
          isAiResponse: true,
        });
      } finally {
        setIsAiThinking(false); // Hide thinking indicator
      }
    } else {
      // Handle user-to-user chat with message permissions from main branch
      try {
        // --- Message Permission Logic from main branch ---
        if (otherParticipantId && currentUser.uid !== otherParticipantId) {
          // Fetch recipient's messagePermission
          const recipientDoc = await getDoc(doc(db, "users", otherParticipantId));
          const recipientData = recipientDoc.data();
          const messagePermission = recipientData?.messagePermission || "everyone";

          // Check if sender is a follower
          let isFollower = false;
          if (messagePermission === "followers") {
            const followerDoc = await getDoc(doc(db, "users", otherParticipantId, "followers", currentUser.uid));
            isFollower = followerDoc.exists();
          }

          if (messagePermission === "followers" && !isFollower) {
            // Store as message request
            await setDoc(
              doc(db, "users", otherParticipantId, "messageRequests", conversationId),
              {
                fromUserId: currentUser.uid,
                text: textToSend,
                createdAt: serverTimestamp(),
                status: "pending",
                conversationId,
              }
            );
            Alert.alert(
              "Message Request Sent",
              "Your message was sent as a request. The user must approve it before you can continue messaging."
            );
            return;
          }
        }

        // --- Normal Message Send Logic from main branch ---
        const conversationRef = doc(db, "conversations", conversationId);

        // Use setDoc with merge to avoid not-found error if conversation doesn't exist yet
        await setDoc(conversationRef, {
          lastMessageAt: serverTimestamp(),
          lastMessageText: textToSend,
          lastMessageSenderId: currentUser.uid,
        }, { merge: true });

        const userConvRef1 = doc(db, `users/${currentUser.uid}/conversations`, conversationId);
        await setDoc(
          userConvRef1,
          {
            otherParticipantId,
            otherParticipantUsername: chatTitle,
            otherParticipantProfileImage: profileImageUrl || '',
            lastMessageAt: serverTimestamp(),
            lastMessageText: textToSend,
          },
          { merge: true }
        );

        // Update other participant's conversation reference
        if (otherParticipantId) {
          const userConvRef2 = doc(db, `users/${otherParticipantId}/conversations`, conversationId);
          // Use setDoc with merge instead of checking existence to avoid race conditions
          await setDoc(userConvRef2, {
            otherParticipantId: currentUser.uid,
            otherParticipantUsername: userProfile?.username || currentUser.displayName || currentUser.email || 'User',
            otherParticipantProfileImage: currentUser.photoURL || '',
            lastMessageAt: serverTimestamp(),
            lastMessageText: textToSend,
          }, { merge: true });
        }
      } catch (error) {
        console.error('Error updating conversation metadata:', error);
        // Don't show alert for metadata updates - the message was already sent successfully
      }
    }
  } catch (error) {
    console.error('Error in handleSend:', error);
    Alert.alert("Error", "Failed to send message. Please try again.");
  }
};

  const handleConfirmProfile = async (preferences: any) => {
    console.log('User confirmed profile with preferences:', preferences);
    setWorkoutPreferences(preferences);
    // Pass preferences directly since state update is async
    await handleSend('yes', preferences);
  };

  const handleEditWorkout = (workout: any) => {
    console.log('User wants to edit workout:', workout.name || 'Workout');
    setEditingWorkout(workout);
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage || !currentUser || !conversationId || conversationId === 'ai_conversation' || selectedMessage.user !== 'user') {
      setDeleteModalVisible(false);
      setSelectedMessage(null);
      return;
    }
    
    try {
      // Delete photo from Storage if message has one
      if (selectedMessage.sharedPhoto) {
        console.log('Deleting photo from storage:', selectedMessage.sharedPhoto.id);
        await deletePhotoFromChat(selectedMessage.sharedPhoto.id, conversationId);
        console.log('Photo deleted from storage successfully');
      }

      console.log('Deleting message document:', selectedMessage.id);
      const messageRef = doc(db, "conversations", conversationId, "messages", selectedMessage.id);
      await deleteDoc(messageRef);
      console.log('Message deleted from Firestore');
      
      setDeleteModalVisible(false);
      setSelectedMessage(null);
      
      const messagesQuery = query(
        collection(db, "conversations", conversationId, "messages"),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      
      const conversationRef = doc(db, "conversations", conversationId);
      let newLastMessageText = "Message deleted";
      let newLastMessageSenderId: string | null = null;
      let newLastMessageAt: any = serverTimestamp();

      if (!messagesSnapshot.empty) {
        const lastMessageData = messagesSnapshot.docs[0].data() as FirestoreMessageData;
        newLastMessageText = lastMessageData.text || "Message deleted";
        newLastMessageSenderId = lastMessageData.senderId || null;
        newLastMessageAt = lastMessageData.createdAt || serverTimestamp();
      } else {
        newLastMessageText = "";
      }
        
      console.log('Updating conversation metadata');
      await updateDoc(conversationRef, {
        lastMessageText: newLastMessageText,
        lastMessageSenderId: newLastMessageSenderId,
        lastMessageAt: newLastMessageAt
      });

      console.log('Updating current user conversation reference');
      const userConvRef1 = doc(db, `users/${currentUser.uid}/conversations`, conversationId);
      await setDoc(
        userConvRef1,
        {
          otherParticipantId: otherParticipantId || '',
          otherParticipantUsername: chatTitle || '',
          otherParticipantProfileImage: profileImageUrl || '',
          lastMessageAt: newLastMessageAt,
          lastMessageText: newLastMessageText,
        },
        { merge: true }
      );
        
      console.log('Fetching conversation data for other participant');
      const conversationSnap = await getDoc(conversationRef);
      const conversationData = conversationSnap.data();
      
      if (conversationData && conversationData.participants && Array.isArray(conversationData.participants)) {
        const otherParticipantIdForRef = conversationData.participants.find((uid: string) => uid !== currentUser.uid);
        console.log('Other participant ID:', otherParticipantIdForRef);

        if (otherParticipantIdForRef && typeof otherParticipantIdForRef === 'string') {
          console.log('Updating other user conversation reference');
          const userConvRef2 = doc(db, `users/${otherParticipantIdForRef}/conversations`, conversationId);
          const updateData = {
            otherParticipantId: currentUser.uid,
            otherParticipantUsername: currentUser.displayName || currentUser.email || 'User',
            otherParticipantProfileImage: currentUser.photoURL || '',
            lastMessageAt: newLastMessageAt,
            lastMessageText: newLastMessageText,
          };
          console.log('Update data being sent:', updateData);
          await setDoc(userConvRef2, updateData, { merge: true });
          console.log('Other user conversation reference updated');
        } else {
          console.log('No other participant found or invalid type');
        }
      } else {
        console.log('Conversation data structure invalid');
      }
    } catch (error) {
      console.error("Error deleting message - Full details:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      Alert.alert("Error", "Failed to delete message. Please try again.");
    }
  };

  const handleLongPress = useCallback((msg: Message) => {
    if (msg.user === 'user' && msg.type !== 'dateHeader') {
      setSelectedMessage(msg);
      setDeleteModalVisible(true);
    }
  }, []);

  const handleReprompt = useCallback(async (repromptMessage: string) => {
    if (!conversationId.endsWith('_ai_conversation')) return;
    
    // Get the last user message from the conversation
    const lastUserMessage = messages.find(msg => msg.user === 'user');
    if (!lastUserMessage) return;
    
    // Create a reprompt based on the last user question
    const reprompt = `${lastUserMessage.text}\n\nPlease provide a different or more detailed response.`;
    
    // Send the reprompt message using the existing handleSend function
    await handleSend(reprompt);
  }, [conversationId, messages, handleSend]);

  const navigateToUserProfile = () => {
    if (conversationId !== 'ai_conversation' && otherParticipantId) {
      router.push(`/profile/${otherParticipantId}`);
    }
  };

  const handleSwipeActiveChange = useCallback((active: boolean) => {
    setScrollEnabled(!active);
  }, []);

  const handleViewPhoto = useCallback((photo: { imageUrl: string; fileSize?: number }) => {
    setViewingPhoto(photo);
  }, []);

  const renderMessage = useCallback<ListRenderItem<Message>>(
    ({ item }) => (
      <MessageItem 
        item={item} 
        onLongPress={handleLongPress} 
        conversationId={conversationId} 
        onReprompt={handleReprompt} 
        onSendMessage={handleSend}
        onConfirmProfile={handleConfirmProfile}
        onEditWorkout={handleEditWorkout}
        onSwipeActiveChange={handleSwipeActiveChange}
        onViewPhoto={handleViewPhoto}
      />
    ),
    [handleLongPress, conversationId, handleReprompt, handleSend, handleConfirmProfile, handleEditWorkout, handleSwipeActiveChange, handleViewPhoto]
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'black' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <SafeAreaView style={{ backgroundColor: '#1E1E1E' }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerUserInfoContainer}
              onPress={navigateToUserProfile}
              disabled={conversationId === 'ai_conversation' || !otherParticipantId}
            >
              {conversationId.endsWith('_ai_conversation') ? (
                <Image 
                  source={require('@/assets/images/logo-dark.png')} 
                  style={styles.headerLogo} 
                  resizeMode="contain"
                />
              ) : profileImageUrl ? (
                <Image source={{ uri: profileImageUrl }} style={styles.profilePic} />
              ) : (
                <Image source={require('@/assets/images/profile-icon.png')} style={styles.profilePic} />
              )}
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerText} numberOfLines={1} ellipsizeMode="tail">
                  {chatTitle}
                </Text>
                {conversationId.endsWith('_ai_conversation') && (
                  <View style={styles.aiStatusRow}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineText}>AI Assistant • Online</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={addDateHeaders(messages)}
            keyExtractor={i => i.id}
            renderItem={renderMessage}

            initialNumToRender={BATCH_SIZE}
            maxToRenderPerBatch={BATCH_SIZE}
            windowSize={5}
            removeClippedSubviews={true}

            inverted
            scrollEnabled={scrollEnabled}
            onEndReached={fetchMore}
            onEndReachedThreshold={0.1}

            ListFooterComponent={
              loadingMore
                ? <ActivityIndicator size="small" color="#fff" />
                : null
            }

            contentContainerStyle={styles.messagesContainer}
          />
        )}

        {/* AI Thinking Indicator */}
        {isAiThinking && (
          <View style={styles.thinkingIndicator}>
            <View style={styles.aiHeader}>
              <View style={[styles.aiIconContainer, { backgroundColor: '#d466ff15' }]}>
                <Image 
                  source={require('@/assets/images/logo-dark.png')} 
                  style={styles.aiLogo}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.aiHeaderInfo}>
                <Text style={styles.aiTitle}>HLTHY Coach</Text>
                <Text style={[styles.aiSubtitle, { color: '#d466ff' }]}>
                  PROCESSING...
                </Text>
              </View>
              <View style={styles.aiStatus}>
                <View style={[styles.aiStatusDot, { backgroundColor: '#d466ff' }]} />
                <Text style={styles.aiStatusText}>THINKING</Text>
              </View>
            </View>
            <View style={styles.aiContentContainer}>
              <View style={styles.thinkingBubble}>
                <View style={styles.thinkingDots}>
                  {thinkingDotAnimations.map((anim, index) => (
                    <Animated.View
                      key={index}
                      style={[
                        styles.thinkingDot,
                        {
                          opacity: anim,
                        }
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.thinkingText}>Analyzing your request...</Text>
              </View>
            </View>
          </View>
        )}

        {/* Delete Message Modal */}
        <Modal
          transparent={true}
          visible={deleteModalVisible}
          animationType="fade"
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setDeleteModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Delete Message</Text>
                <Text style={styles.modalText}>Are you sure you want to delete this message?</Text>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setDeleteModalVisible(false)}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.deleteButton]}
                    onPress={handleDeleteMessage}
                  >
                    <Text style={styles.buttonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Image Viewer Modal */}
        <Modal
          visible={!!viewingPhoto}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setViewingPhoto(null)}
        >
          <View style={styles.imageViewerOverlay}>
            <TouchableOpacity
              style={styles.imageViewerCloseArea}
              activeOpacity={1}
              onPress={() => setViewingPhoto(null)}
            >
              <SafeAreaView style={styles.imageViewerHeader}>
                <TouchableOpacity
                  style={styles.imageViewerCloseButton}
                  onPress={() => setViewingPhoto(null)}
                >
                  <Ionicons name="close" size={28} color="white" />
                </TouchableOpacity>
              </SafeAreaView>
              
              <View style={styles.imageViewerContainer}>
                <Image
                  source={{ uri: viewingPhoto?.imageUrl || '' }}
                  style={styles.imageViewerImage}
                  resizeMode="contain"
                />
              </View>
              
              {viewingPhoto?.fileSize && (
                <View style={styles.imageViewerInfoBar}>
                  <Ionicons name="image" size={16} color="#ccc" style={{ marginRight: 6 }} />
                  <Text style={styles.imageViewerInfoText}>
                    {formatFileSize(viewingPhoto.fileSize)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Modal>
        
        {/* Editing Workout Banner */}
        {editingWorkout && (
          <View style={styles.editingBanner}>
            <View style={styles.editingBannerContent}>
              <Ionicons name="create-outline" size={16} color="#8B7DFF" />
              <View style={styles.editingBannerText}>
                <Text style={styles.editingBannerTitle}>
                  Editing: {editingWorkout.name || 'Workout'}
                </Text>
                <Text style={styles.editingBannerSubtitle}>
                  Tell me what to change!
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setEditingWorkout(null)}>
              <Ionicons name="close" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Photo Upload Progress */}
        {photoUploadProgress && (
          <View style={styles.photoUploadContainer}>
            <ActivityIndicator size="small" color="#d466ff" style={{ marginRight: 8 }} />
            <Text style={styles.photoUploadText}>Uploading photo...</Text>
          </View>
        )}

        {/* Photo Options Modal */}
        {showPhotoOptions && (
          <TouchableOpacity 
            style={styles.photoOptionsOverlay}
            activeOpacity={1}
            onPress={() => setShowPhotoOptions(false)}
          >
            <TouchableOpacity 
              style={styles.photoOptionsMenu}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <TouchableOpacity 
                style={styles.photoOptionItem}
                onPress={() => {
                  setShowPhotoOptions(false);
                  handlePhotoSelect();
                }}
              >
                <View style={styles.photoOptionIconContainer}>
                  <Ionicons name="image" size={24} color="#d466ff" />
                </View>
                <Text style={styles.photoOptionText}>Gallery</Text>
              </TouchableOpacity>
              <View style={styles.photoOptionDivider} />
              <TouchableOpacity 
                style={styles.photoOptionItem}
                onPress={() => {
                  setShowPhotoOptions(false);
                  handlePhotoCapture();
                }}
              >
                <View style={styles.photoOptionIconContainer}>
                  <Ionicons name="camera" size={24} color="#d466ff" />
                </View>
                <Text style={styles.photoOptionText}>Camera</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        
        {/* Input Container */}
        <View style={styles.inputContainer}>
          <View style={styles.unifiedInputPill}>
            <TouchableOpacity 
              style={styles.addPhotoButton}
              onPress={() => setShowPhotoOptions(!showPhotoOptions)}
              disabled={photoUploadProgress}
            >
              <Ionicons name="add" size={28} color={photoUploadProgress ? "#666" : "#d466ff"} />
            </TouchableOpacity>
            <SmartChatInput
              value={input}
              onChangeText={setInput}
              onSend={handleSend}
              disabled={isAiThinking || photoUploadProgress}
              conversationId={conversationId}
              otherParticipantId={otherParticipantId}
              isAiConversation={conversationId.endsWith('_ai_conversation')}
            />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  backButton: {
    padding: 5,
    marginRight: 5,
  },
  headerUserInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 5,
  },
  profilePic: { 
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  headerLogo: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  headerTextContainer: {
    flex: 1,
  },
  aiStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CD964',
    marginRight: 4,
  },
  onlineText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  messagesContainer: {
    padding: 10,
    justifyContent: 'flex-start',
    flexGrow: 1, 
  },
  messageBubble: {
    maxWidth: '70%',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginVertical: 5,
  },
  currentUserMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  otherUserMessage: {
    backgroundColor: '#4A4A4A',
    alignSelf: 'flex-start',
  },
  aiMessage: {
    backgroundColor: 'transparent',
    alignSelf: 'flex-start',
    maxWidth: '85%',
    borderRadius: 0,
    padding: 0,
    marginVertical: 8,
  },
  currentUserText: {
    color: 'white',
  },
  otherUserText: {
    color: 'white',
  },
  aiText: {
    color: 'white',
    fontSize: 16,
    lineHeight: 22,
  },
  unavailableItemBubble: {
    backgroundColor: '#3A3A3A',
    flexDirection: 'row',
    alignItems: 'center'
  },
  inputContainer: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#1E1E1E',
  },
  unifiedInputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#333',
    overflow: 'hidden',
    paddingLeft: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#333',
    color: 'white',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    marginRight: 10,
    maxHeight: 120,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    padding: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sharedPostContainer: {
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderWidth: 1,
    borderColor: '#333',
    width: 200,
  },
  sharedPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sharedPostHeaderText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  sharedPostImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#333',
  },
  sharedPostCaption: {
    color: '#FFF',
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  dateHeaderContainer: {
    alignItems: 'center',
    marginVertical: 15,
    paddingVertical: 5,
  },
  dateHeaderText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#222',
    borderRadius: 15,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    color: '#DDD',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#444',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sharedMilestoneContainer: {
    marginVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(20, 60, 100, 0.8)',
    borderWidth: 2,
    borderColor: '#0bb',
    overflow: 'hidden',
    width: 280,
  },
  sharedMilestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0bb',
    backgroundColor: 'rgba(15, 45, 80, 0.9)',
  },
  sharedMilestoneHeaderText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  sharedMilestoneContent: {
    padding: 12,
  },
  sharedMilestoneType: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  milestoneStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  milestoneValue: {
    color: '#4CD964',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  milestonePrevious: {
    color: '#999',
    fontSize: 14,
  },
  milestoneImprovement: {
    color: '#4CD964',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 'auto',
  },
  weightMilestoneContent: {
    padding: 12,
  },
  weightChangeValue: {
    color: '#4CD964',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  weightChangeDetails: {
    color: '#999',
    fontSize: 14,
  },
  sharedWorkoutContainer: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(100, 20, 20, 0.8)',
    borderWidth: 2,
    borderColor: '#b00',
    overflow: 'hidden',
    width: 200,
  },
  sharedWorkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#b00',
    backgroundColor: 'rgba(80, 20, 20, 0.9)', 
  },
  sharedWorkoutHeaderText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  sharedWorkoutImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#333',
  },
  sharedWorkoutTitle: {
    color: '#FFF',
    fontSize: 14,
    padding: 10,
    textAlign: 'center',
  },
  thinkingIndicator: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    alignSelf: 'flex-start',
    maxWidth: '90%',
    marginVertical: 8,
  },
  thinkingBubble: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    alignSelf: 'flex-start',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  thinkingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  thinkingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  thinkingText: {
    color: 'white',
    fontSize: 13,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  // Enhanced AI Message Styles
  aiMessageContainer: {
    alignSelf: 'flex-start',
    maxWidth: '90%',
    marginVertical: 8,
    marginHorizontal: 10,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  aiIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  aiLogo: {
    width: 20,
    height: 20,
  },
  aiIcon: {
    fontSize: 16,
  },
  aiHeaderInfo: {
    flex: 1,
  },
  aiTitle: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  aiSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.8,
    marginTop: 1,
  },
  aiSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  aiTimestamp: {
    color: '#666',
    fontSize: 10,
    marginLeft: 4,
  },
  aiStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  aiStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  aiStatusText: {
    color: '#888',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  aiContentContainer: {
    paddingLeft: 42, // Align with header text
  },
  aiContentBubble: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  aiMessageContent: {
    padding: 16,
  },
  aiParagraph: {
    marginBottom: 12,
  },
  aiListItem: {
    color: 'white',
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 4,
    paddingLeft: 8,
    flex: 1,
  },
  aiListItemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  aiListBullet: {
    color: '#4ECDC4',
    fontWeight: '600',
    fontSize: 15,
    marginRight: 8,
    marginTop: 1,
  },
  aiNumberedItem: {
    color: 'white',
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 4,
  },
  aiHeading: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 4,
  },
  aiWorkoutBlock: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4ECDC4',
  },
  aiWorkoutText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  bulletPoint: {
    color: '#4ECDC4',
    fontWeight: '600',
  },
  workoutBlock: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4ECDC4',
  },
  workoutLine: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  aiSectionHeader: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 4,
  },
  aiActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    gap: 12,
  },
  aiActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 4,
  },
  aiActionButtonActive: {
    backgroundColor: 'rgba(76, 217, 100, 0.2)',
  },
  aiActionLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '500',
  },
  // Share Modal Styles
  shareModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  shareModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  shareModalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  shareModalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  shareModalSendButton: {
    backgroundColor: '#4CD964',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  shareModalSendButtonDisabled: {
    backgroundColor: '#333',
  },
  shareModalSendButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  shareModalSendButtonTextDisabled: {
    color: '#888',
  },
  sharePreview: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  sharePreviewTitle: {
    color: '#4CD964',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  sharePreviewText: {
    color: '#DDD',
    fontSize: 14,
    lineHeight: 20,
  },
  shareSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  shareSearchIcon: {
    marginRight: 8,
  },
  shareSearchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
  },
  shareUsersList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  shareUsersListTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  shareLoadingIndicator: {
    marginVertical: 20,
  },
  shareNoResults: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  shareUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  shareUserItemSelected: {
    backgroundColor: 'rgba(76, 217, 100, 0.1)',
  },
  shareUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  shareUserInfo: {
    flex: 1,
  },
  shareUserName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  shareUserHandle: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  followingTag: {
    color: '#4CD964',
    fontSize: 12,
    fontWeight: '500',
  },
  editingBanner: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#8B7DFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editingBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  editingBannerText: {
    flex: 1,
  },
  editingBannerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  editingBannerSubtitle: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  // Photo Sharing Styles
  sharedPhotoContainer: {
    marginVertical: 8,
    marginHorizontal: 10,
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: 280,
  },
  sharedPhotoImage: {
    width: 280,
    height: 280,
  },
  // Image Viewer Modal Styles
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  imageViewerCloseArea: {
    flex: 1,
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  imageViewerCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
  },
  imageViewerInfoBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  imageViewerInfoText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
  },
  photoUploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 102, 255, 0.1)',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#d466ff',
  },
  photoUploadText: {
    color: '#d466ff',
    fontSize: 14,
    fontWeight: '500',
  },
  addPhotoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 102, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  photoOptionsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'flex-end',
    paddingLeft: 10,
    paddingBottom: 60,
  },
  photoOptionsMenu: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 160,
    maxWidth: 200,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  photoOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  photoOptionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 102, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  photoOptionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  photoOptionDivider: {
    height: 1,
    backgroundColor: '#444',
  },
});
