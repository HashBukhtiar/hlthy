import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { ConversationRepository } from '@/features/messaging/infra/conversationRepository';
import { Conversation, MessageRequest, UserSearchResult } from '@/features/messaging/domain/Conversation';
import { logger } from '@/shared/utils/logger';

export interface UseDMsResult {
  // Conversation list
  conversations: Conversation[];
  loading: boolean;
  refreshing: boolean;
  fetchConversations: () => Promise<void>;
  refresh: () => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  togglePin: (conversationId: string) => Promise<void>;
  toggleMute: (conversationId: string) => Promise<void>;

  // Message requests
  messageRequests: MessageRequest[];
  loadingRequests: boolean;

  // Recipient search (for compose — raw, unfiltered by block status)
  rawRecipientResults: UserSearchResult[];
  searchLoading: boolean;
  searchRecipients: (queryText: string) => Promise<void>;
  clearRecipientSearch: () => void;

  // Start/resume a conversation; returns the conversationId
  findOrCreateConversation: (
    otherUserId: string,
    otherUsername: string,
    otherProfileImageUrl?: string
  ) => Promise<string>;
}

export function useDMs(): UseDMsResult {
  const { currentUser } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [messageRequests, setMessageRequests] = useState<MessageRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const [rawRecipientResults, setRawRecipientResults] = useState<UserSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // ── Conversation list ─────────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    if (!currentUser) {
      setConversations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await ConversationRepository.listForUser(currentUser.uid);
      setConversations(result);
    } catch (error) {
      logger.error('useDMs', 'Failed to fetch conversations', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const refresh = useCallback(async () => {
    if (!currentUser) return;
    setRefreshing(true);
    try {
      const result = await ConversationRepository.listForUser(currentUser.uid);
      setConversations(result);
    } catch (error) {
      logger.error('useDMs', 'Failed to refresh conversations', error);
    } finally {
      setRefreshing(false);
    }
  }, [currentUser]);

  // Reload whenever the DMs screen comes into focus.
  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      if (!currentUser) return;
      await ConversationRepository.deleteForUser(currentUser.uid, conversationId);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
    },
    [currentUser]
  );

  const sortConversations = useCallback((list: Conversation[]): Conversation[] => {
    const ai = list.filter(c => c.isPinnedAI);
    const rest = list.filter(c => !c.isPinnedAI);
    rest.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (a.isUnread && !b.isUnread) return -1;
      if (!a.isUnread && b.isUnread) return 1;
      if (a.lastMessageAt && b.lastMessageAt) return b.lastMessageAt.toMillis() - a.lastMessageAt.toMillis();
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return 0;
    });
    return [...ai, ...rest];
  }, []);

  const togglePin = useCallback(
    async (conversationId: string) => {
      if (!currentUser) return;
      const convo = conversations.find(c => c.id === conversationId);
      if (!convo) return;
      const wasPinned = !!convo.isPinned;

      setConversations(prev =>
        sortConversations(prev.map(c => c.id === conversationId ? { ...c, isPinned: !wasPinned } : c))
      );

      try {
        if (wasPinned) {
          await ConversationRepository.unpinConversation(currentUser.uid, conversationId);
        } else {
          await ConversationRepository.pinConversation(currentUser.uid, conversationId);
        }
      } catch (error) {
        logger.error('useDMs', 'Failed to toggle pin', error);
        setConversations(prev =>
          sortConversations(prev.map(c => c.id === conversationId ? { ...c, isPinned: wasPinned } : c))
        );
      }
    },
    [currentUser, conversations, sortConversations]
  );

  const toggleMute = useCallback(
    async (conversationId: string) => {
      if (!currentUser) return;
      const convo = conversations.find(c => c.id === conversationId);
      if (!convo) return;
      const wasMuted = !!convo.isMuted;

      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, isMuted: !wasMuted } : c)
      );

      try {
        if (wasMuted) {
          await ConversationRepository.unmuteConversation(currentUser.uid, conversationId);
        } else {
          await ConversationRepository.muteConversation(currentUser.uid, conversationId);
        }
      } catch (error) {
        logger.error('useDMs', 'Failed to toggle mute', error);
        setConversations(prev =>
          prev.map(c => c.id === conversationId ? { ...c, isMuted: wasMuted } : c)
        );
      }
    },
    [currentUser, conversations]
  );

  // ── Message requests ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!currentUser) {
      setMessageRequests([]);
      setLoadingRequests(false);
      return;
    }
    setLoadingRequests(true);
    ConversationRepository.listMessageRequests(currentUser.uid)
      .then(setMessageRequests)
      .catch(err => {
        logger.error('useDMs', 'Failed to fetch message requests', err);
        setMessageRequests([]);
      })
      .finally(() => setLoadingRequests(false));
  }, [currentUser]);

  // ── Recipient search ──────────────────────────────────────────────────────

  const searchRecipients = useCallback(
    async (queryText: string) => {
      if (!queryText.trim() || !currentUser) {
        setRawRecipientResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        const results = await ConversationRepository.searchPotentialRecipients(
          queryText,
          currentUser.uid
        );
        setRawRecipientResults(results);
      } catch (error) {
        logger.error('useDMs', 'Failed to search recipients', error);
        setRawRecipientResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [currentUser]
  );

  const clearRecipientSearch = useCallback(() => {
    setRawRecipientResults([]);
  }, []);

  // ── Find or create conversation ───────────────────────────────────────────

  const findOrCreateConversation = useCallback(
    async (
      otherUserId: string,
      otherUsername: string,
      otherProfileImageUrl?: string
    ): Promise<string> => {
      if (!currentUser) throw new Error('No authenticated user');
      return ConversationRepository.findOrCreate(
        currentUser.uid,
        currentUser.displayName || currentUser.email || 'User',
        currentUser.photoURL || '',
        otherUserId,
        otherUsername,
        otherProfileImageUrl
      );
    },
    [currentUser]
  );

  return {
    conversations,
    loading,
    refreshing,
    fetchConversations,
    refresh,
    deleteConversation,
    togglePin,
    toggleMute,
    messageRequests,
    loadingRequests,
    rawRecipientResults,
    searchLoading,
    searchRecipients,
    clearRecipientSearch,
    findOrCreateConversation,
  };
}
