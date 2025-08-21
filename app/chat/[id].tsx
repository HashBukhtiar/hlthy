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
} from 'react-native';
import { db } from '@/firebaseConfig';
import { 
  doc, 
  getDoc,
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
  setDoc, 
  limit,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { sendMessage, sendMessageWithIntent, IntentClassificationResult } from '@/ai/ai_chat';
import { SmartChatInput } from '@/components/SmartChatInput';
import { IntentMessageWrapper } from '@/components/IntentBadge';
import { calculateImprovementPercentage } from '@/logic/milesonteUtils';
import { generateId } from '@/logic/idGenerator';
import { getOptimalImageUrl } from '@/utils/imageUtils';

interface FirestoreMessageData {
  senderId: string;
  text: string;
  createdAt: Timestamp;
  isAiResponse?: boolean; // Flag to identify AI responses
  intent?: string; // Add intent field
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
}

interface Message {
  id: string;
  text: string;
  user: 'user' | 'other' | 'ai';
  role: 'user' | 'model';
  createdAt?: Date;
  intent?: string; // Add intent field
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
      resolvedSharedPost = {
        ...data.sharedPost,
        isAvailable: postSnap.exists(),
      };
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
      resolvedSharedWorkout = {
        ...data.sharedWorkout,
        isAvailable: workoutSnap.exists(),
      };
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
    sharedPost: resolvedSharedPost,
    sharedMilestone: resolvedSharedMilestone,
    sharedWorkout: resolvedSharedWorkout,
    type: "message",
  };
}


const MessageItem = React.memo<{ item: Message; onLongPress: (m: Message) => void; conversationId: string }>(
  ({ item, onLongPress, conversationId }) => {
    const router = useRouter();
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
                  {item.sharedMilestone.details.value}{item.sharedMilestone.details.weightUnit}
                  {item.sharedMilestone.details.reps != null && item.sharedMilestone.details.reps > 1 && ` × ${item.sharedMilestone.details.reps}`}
                </Text>
                {item.sharedMilestone.details.previousValue != null && (
                  <Text style={styles.milestonePrevious}>
                    from {item.sharedMilestone.details.previousValue}{item.sharedMilestone.details.weightUnit}
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
                {item.sharedMilestone.details.totalLoss} {item.sharedMilestone.details.newWeightUnit}
              </Text>
              <Text style={styles.weightChangeDetails}>
                {item.sharedMilestone.details.previousWeight} → {item.sharedMilestone.details.newWeight}
                {item.sharedMilestone.details.newWeightUnit}
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
              source={{ uri: getOptimalImageUrl(item.sharedWorkout.thumbnailUrl, item.sharedWorkout.coverImageUrl) || undefined }} 
              style={styles.sharedWorkoutImage} 
            />
          )}
          <Text style={styles.sharedWorkoutTitle} numberOfLines={2}>
            {item.sharedWorkout.title}
          </Text>
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
          <AIMessageBubble 
            message={item.text}
            intent={item.intent}
            onLongPress={() => onLongPress(item)}
            isAiConversation={conversationId.endsWith('_ai_conversation')}
            timestamp={item.createdAt}
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
      prev.item.sharedWorkout?.thumbnailUrl === next.item.sharedWorkout?.thumbnailUrl
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

  let currentDayMessages: Message[] = [];
  let currentDayStr: string | null = msgs[0].createdAt
    ? msgs[0].createdAt.toLocaleDateString(undefined, dateOptions)
    : null;

  for (let i = 0; i < msgs.length; i++) {
    const msg = msgs[i];
    const msgDayStr = msg.createdAt ? msg.createdAt.toLocaleDateString(undefined, dateOptions) : null;

    if (msgDayStr !== currentDayStr) {
      if (currentDayMessages.length > 0) {
        out.push(...currentDayMessages);
      }
      if (currentDayStr) {
        out.push({
          id: `date-${currentDayStr}`,
          text: currentDayStr,
          type: 'dateHeader',
          user: 'other',
          role: 'model',
          createdAt: currentDayMessages.length > 0 ? currentDayMessages[currentDayMessages.length-1].createdAt : undefined
        });
      }
      currentDayMessages = [];
      currentDayStr = msgDayStr;
    }

    // Add current message to its day's collection, if it has a date
    if (msgDayStr) {
      currentDayMessages.push(msg);
    } else {
      out.push(msg);
    }
  }

  // After the loop, add any remaining messages and their header
  if (currentDayMessages.length > 0) {
    out.push(...currentDayMessages);
  }
  if (currentDayStr && currentDayMessages.length > 0) {
    out.push({
      id: `date-${currentDayStr}`,
      text: currentDayStr,
      type: 'dateHeader',
      user: 'other',
      role: 'model',
      createdAt: currentDayMessages.length > 0 ? currentDayMessages[currentDayMessages.length-1].createdAt : undefined
    });
  }
  
  return out;
}

// Enhanced AI Message Component
interface AIMessageBubbleProps {
  message: string;
  intent?: string;
  onLongPress: () => void;
  isAiConversation?: boolean;
  timestamp?: Date;
}

const AIMessageBubble: React.FC<AIMessageBubbleProps> = ({ message, intent, onLongPress, isAiConversation, timestamp }) => {
  const intentConfigs = {
    planner: { 
      icon: '🏋️', 
      color: '#FF6B35', 
      gradient: ['#FF6B35', '#F7931E'],
      label: 'WORKOUT PLANNER'
    },
    technique: { 
      icon: '🎯', 
      color: '#F7931E', 
      gradient: ['#F7931E', '#FFD700'],
      label: 'TECHNIQUE HELP'
    },
    explain: { 
      icon: '📚', 
      color: '#4ECDC4', 
      gradient: ['#4ECDC4', '#45B7D1'],
      label: 'EDUCATION'
    },
    schedule: { 
      icon: '📅', 
      color: '#45B7D1', 
      gradient: ['#45B7D1', '#96CEB4'],
      label: 'SCHEDULING'
    },
    chit_chat: { 
      icon: '💬', 
      color: '#96CEB4', 
      gradient: ['#96CEB4', '#FFEAA7'],
      label: 'CHAT'
    },
  } as const;

  const config = intent && intentConfigs[intent as keyof typeof intentConfigs] 
    ? intentConfigs[intent as keyof typeof intentConfigs] 
    : { icon: '🤖', color: '#d466ff', gradient: ['#d466ff', '#9f44ff'], label: 'AI ASSISTANT' };

  // Format message with better structure
  const formatMessage = (text: string) => {
    // Clean and split the text
    const cleanText = text.replace(/```json\s*|\s*```/g, '').trim();
    const paragraphs = cleanText.split('\n\n').filter(p => p.trim());
    
    return paragraphs.map((paragraph, index) => {
      const trimmedParagraph = paragraph.trim();
      
      // Handle workout routines (often contain structured data)
      if (trimmedParagraph.includes('Week') || trimmedParagraph.includes('Day') || trimmedParagraph.includes('Sets:')) {
        const lines = trimmedParagraph.split('\n').map(line => line.trim()).filter(line => line);
        return (
          <View key={index} style={styles.workoutBlock}>
            {lines.map((line, lineIndex) => (
              <Text key={lineIndex} style={styles.workoutLine}>
                {line}
              </Text>
            ))}
          </View>
        );
      }
      
      // Handle bullet points and lists
      if (trimmedParagraph.includes('•') || trimmedParagraph.includes('-') || /^\d+\./.test(trimmedParagraph)) {
        const lines = trimmedParagraph.split('\n').map(line => line.trim()).filter(line => line);
        return (
          <View key={index} style={styles.aiParagraph}>
            {lines.map((line, lineIndex) => {
              const cleanLine = line.replace(/^[•\-]\s*/, '').replace(/^\d+\.\s*/, '');
              const isNumbered = /^\d+\./.test(line);
              const bulletChar = isNumbered ? `${line.match(/^\d+/)?.[0]}.` : '•';
              
              return (
                <Text key={lineIndex} style={styles.aiListItem}>
                  <Text style={styles.bulletPoint}>{bulletChar} </Text>
                  {cleanLine}
                </Text>
              );
            })}
          </View>
        );
      }
      
      // Handle headers (lines that are short and followed by content)
      if (trimmedParagraph.length < 50 && !trimmedParagraph.includes('.') && index < paragraphs.length - 1) {
        return (
          <Text key={index} style={styles.aiSectionHeader}>
            {trimmedParagraph}
          </Text>
        );
      }
      
      // Regular paragraphs
      return (
        <Text key={index} style={[styles.aiText, styles.aiParagraph]}>
          {trimmedParagraph}
        </Text>
      );
    });
  };

  return (
    <TouchableOpacity
      onLongPress={onLongPress}
      delayLongPress={500}
      activeOpacity={0.7}
      style={styles.aiMessageContainer}
    >
      {/* AI Header */}
      <View style={styles.aiHeader}>
        <View style={[styles.aiIconContainer, { backgroundColor: `${config.color}15` }]}>
          {isAiConversation ? (
            <Image 
              source={require('@/assets/images/logo-dark.png')} 
              style={styles.aiLogo}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.aiIcon}>{config.icon}</Text>
          )}
        </View>
        <View style={styles.aiHeaderInfo}>
          <Text style={styles.aiTitle}>HLTHY Coach</Text>
          <View style={styles.aiSubtitleRow}>
            <Text style={[styles.aiSubtitle, { color: config.color }]}>
              {config.label}
            </Text>
            {timestamp && (
              <Text style={styles.aiTimestamp}>
                • {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.aiStatus}>
          <View style={[styles.aiStatusDot, { backgroundColor: config.color }]} />
          <Text style={styles.aiStatusText}>ONLINE</Text>
        </View>
      </View>

      {/* Message Content */}
      <View style={styles.aiContentContainer}>
        <View style={[styles.aiContentBubble]}>
          <View style={styles.aiMessageContent}>
            {formatMessage(message)}
          </View>
          
          {/* Action Buttons */}
          <View style={styles.aiActions}>
            <TouchableOpacity 
              style={styles.aiActionButton}
              onPress={() => {
                // Copy message to clipboard
                // TODO: Implement clipboard copy
              }}
            >
              <Ionicons name="copy-outline" size={16} color="#888" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.aiActionButton}
              onPress={() => {
                // Share message
                // TODO: Implement sharing
              }}
            >
              <Ionicons name="share-outline" size={16} color="#888" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.aiActionButton}
              onPress={() => {
                // Like/feedback
                // TODO: Implement feedback
              }}
            >
              <Ionicons name="thumbs-up-outline" size={16} color="#888" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.aiActionButton}
              onPress={() => {
                // Regenerate response
                // TODO: Implement regeneration
              }}
            >
              <Ionicons name="refresh-outline" size={16} color="#888" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id as string;
  const { currentUser } = useAuth();
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
    // setLoading(true); // Handled by the effect above or initial state
    // setHasMoreMessages(true); // Reset when conversationId changes

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

    const convRef = doc(db, "conversations", conversationId);
    getDoc(convRef).then(snap => {
      if (!snap.exists()) return;
      const data = snap.data() as any;
      const otherId = data.participants.find((uid: string) => uid !== currentUser.uid);
      if (!otherId) return;
      setOtherParticipantId(otherId);
      setChatTitle(data.participantUsernames[otherId]);
      setProfileImageUrl(data.participantProfileImages[otherId]);
    });
  }, [currentUser, conversationId]);


  const handleSend = async (textToSend: string, intentResult?: IntentClassificationResult) => {
    Keyboard.dismiss();
    
    console.log("Current user:", currentUser);
    console.log("Current user UID:", currentUser?.uid);
    console.log("Conversation ID:", conversationId);
    console.log("Intent result:", intentResult);
    
    if (!textToSend.trim() || !currentUser || !conversationId) {
      console.log("Validation failed - input:", textToSend.trim(), "currentUser:", !!currentUser, "conversationId:", conversationId);
      return;
    }

    setInput('');

    const isAiChat = conversationId.endsWith('_ai_conversation');
    
    try {
      // Ensure conversation document exists for AI chats
      if (isAiChat) {
        const conversationRef = doc(db, "conversations", conversationId);
        console.log("Checking if AI conversation exists for ID:", conversationId);
        const conversationSnap = await getDoc(conversationRef);
        
        if (!conversationSnap.exists()) {
          console.log("Creating AI conversation document");
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
          console.log("Conversation data to be saved:", conversationData);
          await setDoc(conversationRef, conversationData);
          console.log("AI conversation document created successfully");
        } else {
          console.log("AI conversation document already exists");
        }
      }

      const messagesRef = collection(db, "conversations", conversationId, "messages");

      // Add user's message to Firestore with intent information
      console.log("Adding user message to Firestore:", textToSend);
      const messageData: any = {
        text: textToSend,
        createdAt: serverTimestamp(),
        senderId: currentUser.uid,
      };
      
      // Only add intent field if intentResult exists and has intent property
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

          // Use the enhanced sendMessage function
          const aiResponseText = await sendMessage(historyForAPI, textToSend);

          // Save AI's response to Firestore using current user's ID with isAiResponse flag
          const aiMessageData: any = {
            text: aiResponseText,
            createdAt: serverTimestamp(),
            senderId: currentUser.uid, // Use current user's ID to avoid permission issues
            isAiResponse: true, // Flag to identify this as an AI response
          };
          
          // Only add intent field if intentResult exists and has intent property
          if (intentResult?.intent) {
            aiMessageData.intent = intentResult.intent;
          }
          
          await addDoc(messagesRef, aiMessageData);
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
        // Handle user-to-user chat metadata updates
        try {
          const conversationRef = doc(db, "conversations", conversationId);
          await updateDoc(conversationRef, {
            lastMessageAt: serverTimestamp(),
            lastMessageText: textToSend,
            lastMessageSenderId: currentUser.uid,
          });

          const conversationSnap = await getDoc(conversationRef);
          const participants = conversationSnap.data()?.participants;
          if (participants) {
            for (const userId of participants) {
              const userConvRef = doc(db, `users/${userId}/conversations`, conversationId);
              const userConvSnap = await getDoc(userConvRef);
              if (userConvSnap.exists()) {
                await updateDoc(userConvRef, {
                  lastMessageAt: serverTimestamp(),
                  lastMessageText: textToSend,
                });
              }
            }
          }
        } catch (error) {
          console.error('Error updating conversation metadata:', error);
          Alert.alert("Error", "Failed to update conversation. Please try again.");
        }
      }
    } catch (error) {
      console.error('Error in handleSend:', error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage || !currentUser || !conversationId || conversationId === 'ai_conversation' || selectedMessage.user !== 'user') {
      setDeleteModalVisible(false);
      setSelectedMessage(null);
      return;
    }
    
    try {
      const messageRef = doc(db, "conversations", conversationId, "messages", selectedMessage.id);
      await deleteDoc(messageRef);
      
      setDeleteModalVisible(false);
      setSelectedMessage(null);
      
      const messagesQuery = query(
        collection(db, "conversations", conversationId, "messages"),
        orderBy("createdAt", "desc"),
        limit(1) // We only need the new last message
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      
      const conversationRef = doc(db, "conversations", conversationId);
      let newLastMessageText = "Message deleted";
      let newLastMessageSenderId = null;
      let newLastMessageAt: any = serverTimestamp();

      if (!messagesSnapshot.empty) {
        const lastMessageData = messagesSnapshot.docs[0].data() as FirestoreMessageData;
        newLastMessageText = lastMessageData.text || "Message deleted";
        newLastMessageSenderId = lastMessageData.senderId;
        newLastMessageAt = lastMessageData.createdAt;
      } else {
        newLastMessageText = "";
      }
        
      await updateDoc(conversationRef, {
        lastMessageText: newLastMessageText,
        lastMessageSenderId: newLastMessageSenderId,
        lastMessageAt: newLastMessageAt
      });
        
      const userConvRef1 = doc(db, `users/${currentUser.uid}/conversations`, conversationId);
      await updateDoc(userConvRef1, {
        lastMessageText: newLastMessageText,
        lastMessageAt: newLastMessageAt
      });
        
      const conversationSnap = await getDoc(conversationRef);
      const conversationData = conversationSnap.data();
      const otherUserId = conversationData?.participants?.find((uid: string) => uid !== currentUser.uid);
        
      if (otherUserId) {
        const userConvRef2 = doc(db, `users/${otherUserId}/conversations`, conversationId);
        // Ensure the other user's ref exists before trying to update
        const otherUserConvSnap = await getDoc(userConvRef2);
        if (otherUserConvSnap.exists()) {
            await updateDoc(userConvRef2, {
                lastMessageText: newLastMessageText,
                lastMessageAt: newLastMessageAt
            });
        }
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      Alert.alert("Error", "Failed to delete message. Please try again.");
    }
  };

  const handleLongPress = useCallback((msg: Message) => {
    if (msg.user === 'user' && msg.type !== 'dateHeader') {
      setSelectedMessage(msg);
      setDeleteModalVisible(true);
    }
  }, []);

  const navigateToUserProfile = () => {
    if (conversationId !== 'ai_conversation' && otherParticipantId) {
      router.push(`/profile/${otherParticipantId}`);
    }
  };

  const renderMessage = useCallback<ListRenderItem<Message>>(
    ({ item }) => <MessageItem item={item} onLongPress={handleLongPress} conversationId={conversationId} />,
    [handleLongPress, conversationId]
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

        {/* Smart Input with Intent Classification */}
        <SmartChatInput
          value={input}
          onChangeText={setInput}
          onSend={handleSend}
          placeholder={conversationId.endsWith('_ai_conversation') ? "Ask me anything about fitness..." : "Type your message..."}
          disabled={isAiThinking}
        />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#1E1E1E',
  },
  input: {
    flex: 1,
    backgroundColor: '#333',
    color: 'white',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    marginRight: 10,
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
    gap: 8,
  },
  aiActionButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});