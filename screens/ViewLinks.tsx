import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/context/AuthContext';
import { ProfileRepository } from '@/features/profile/infra/profileRepository';
import { VERIFIED_PLATFORMS, type PlatformKey } from '@/utils/socialLinkValidation';
import { getOptimalImageUrl } from '@/utils/imageUtils';

// ── Brand colours ────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  facebook: '#1877F2',
  twitter: '#1DA1F2',
  tiktok: '#69C9D0',
  youtube: '#FF0000',
  linkedin: '#0077B5',
  spotify: '#1DB954',
  snapchat: '#FFFC00',
  twitch: '#9146FF',
  github: '#f0f6fc',
  customUrl: '#FF9500',
};

// ── Handle extraction ────────────────────────────────────────────────────────

function extractHandle(url: string, platform: string): string {
  try {
    const { pathname } = new URL(url);
    const parts = pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] ?? '';
    if (platform === 'tiktok') return last.startsWith('@') ? last : `@${last}`;
    if (platform === 'youtube' && last.startsWith('@')) return last;
    if (platform === 'linkedin') return `in/${last}`;
    return last ? `@${last}` : url;
  } catch {
    return url;
  }
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

interface SocialLinks {
  [K: string]: string | boolean | undefined;
  customUrl?: string;
  customLabel?: string;
  showLinksToFollowersOnly?: boolean;
}

interface ProfileData {
  displayName: string;
  username: string;
  profileImageUrl: string;
  profileThumbnailUrl?: string | null;
  socialLinks?: SocialLinks;
}

interface LinkItem {
  key: string;
  platform: string;
  icon: string;
  color: string;
  url: string;
  handle: string;
  isCustom: boolean;
  label?: string;
}

interface ViewLinksProps {
  userId: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ViewLinks({ userId }: ViewLinksProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentUser } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = currentUser?.uid === userId;

  // Fetch profile + follow status
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const raw = await ProfileRepository.getById(userId);
        if (cancelled) return;

        const p: ProfileData = {
          displayName: (raw.displayName as string) || '',
          username: (raw.username as string) || '',
          profileImageUrl: (raw.profileImageUrl as string) || '',
          profileThumbnailUrl: (raw.profileThumbnailUrl as string | null) ?? null,
          socialLinks: (raw.socialLinks as SocialLinks) ?? undefined,
        };
        setProfile(p);

        if (!isOwnProfile && currentUser?.uid) {
          const { isFollowing: f } = await ProfileRepository.getFollowStatus(userId, currentUser.uid);
          if (!cancelled) setIsFollowing(f);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId, currentUser?.uid, isOwnProfile]);

  // Build link list
  const links: LinkItem[] = React.useMemo(() => {
    if (!profile?.socialLinks) return [];
    const sl = profile.socialLinks;
    const items: LinkItem[] = [];

    for (const [key, platformDef] of Object.entries(VERIFIED_PLATFORMS)) {
      const url = sl[key as PlatformKey];
      if (typeof url === 'string' && url) {
        items.push({
          key,
          platform: platformDef.name,
          icon: platformDef.icon,
          color: PLATFORM_COLORS[key] ?? '#FFFFFF',
          url,
          handle: extractHandle(url, key),
          isCustom: false,
        });
      }
    }

    if (sl.customUrl) {
      items.push({
        key: 'customUrl',
        platform: sl.customLabel || 'Website',
        icon: 'globe-outline',
        color: PLATFORM_COLORS.customUrl,
        url: sl.customUrl,
        handle: extractHostname(sl.customUrl),
        isCustom: true,
        label: sl.customLabel,
      });
    }

    return items;
  }, [profile]);

  // Staggered card animations
  const animValues = useRef<Animated.Value[]>([]);
  useEffect(() => {
    if (links.length === 0) return;
    animValues.current = links.map(() => new Animated.Value(0));
    const animations = animValues.current.map((val, i) =>
      Animated.timing(val, {
        toValue: 1,
        duration: 280,
        delay: 80 + i * 60,
        useNativeDriver: true,
      })
    );
    Animated.parallel(animations).start();
  }, [links.length]);

  // Header animation
  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!loading) {
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const openLink = useCallback(async (item: LinkItem) => {
    const open = async () => {
      try {
        const canOpen = await Linking.canOpenURL(item.url);
        if (canOpen) {
          await Linking.openURL(item.url);
        } else {
          Alert.alert('Error', `Cannot open ${item.platform} link`);
        }
      } catch {
        Alert.alert('Error', `Failed to open ${item.platform} link`);
      }
    };

    if (item.isCustom) {
      Alert.alert(
        'External Link',
        'This is a custom URL. Only visit sites you trust.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open', onPress: open },
        ]
      );
    } else {
      await open();
    }
  }, []);

  // Privacy check
  const showLinksToFollowersOnly = profile?.socialLinks?.showLinksToFollowersOnly === true;
  const canViewLinks = isOwnProfile || !showLinksToFollowersOnly || isFollowing;

  // ── Render helpers ──────────────────────────────────────────────────────────

  const renderHeader = () => {
    const avatarUri = profile
      ? getOptimalImageUrl(profile.profileThumbnailUrl ?? null, profile.profileImageUrl)
      : null;

    return (
      <Animated.View
        style={[
          styles.pageHeader,
          { paddingTop: insets.top + 8 },
          { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }] },
        ]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidHeaderBg]} />
        )}

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
              <Ionicons name="person" size={16} color="rgba(255,255,255,0.4)" />
            </View>
          )}
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerName} numberOfLines={1}>
              {profile?.displayName || ' '}
            </Text>
            {profile?.username ? (
              <Text style={styles.headerUsername} numberOfLines={1}>
                @{profile.username}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.headerRight} />
      </Animated.View>
    );
  };

  const renderLinkCard = (item: LinkItem, index: number) => {
    const anim = animValues.current[index] ?? new Animated.Value(1);
    const cardStyle = {
      opacity: anim,
      transform: [
        {
          translateY: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [18, 0],
          }),
        },
      ],
    };

    const iconBg = `${item.color}2E`; // ~18% opacity hex approximation via rgba below
    const isSnapchat = item.key === 'snapchat';

    return (
      <Animated.View key={item.key} style={cardStyle}>
        <TouchableOpacity
          style={styles.linkCard}
          onPress={() => openLink(item)}
          activeOpacity={0.75}
        >
          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: `${item.color}28` }]}>
            <Ionicons
              name={item.icon as any}
              size={24}
              color={isSnapchat ? '#CFCF00' : item.color}
            />
          </View>

          {/* Text */}
          <View style={styles.linkTextBlock}>
            <Text style={styles.linkPlatform}>{item.platform}</Text>
            <Text style={styles.linkHandle} numberOfLines={1}>
              {item.handle}
            </Text>
          </View>

          {/* Chevron */}
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.28)" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderPrivate = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="lock-closed" size={28} color="rgba(255,255,255,0.3)" />
      </View>
      <Text style={styles.emptyTitle}>Links are private</Text>
      <Text style={styles.emptySubtitle}>Follow this user to see their links</Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="link" size={28} color="rgba(255,255,255,0.3)" />
      </View>
      <Text style={styles.emptyTitle}>No links added</Text>
      <Text style={styles.emptySubtitle}>This user hasn't added any social links yet</Text>
    </View>
  );

  // ── Main render ─────────────────────────────────────────────────────────────

  const HEADER_HEIGHT = insets.top + 64;

  return (
    <View style={styles.root}>
      {renderHeader()}

      {loading ? (
        <View style={[styles.loadingContainer, { paddingTop: HEADER_HEIGHT }]}>
          <ActivityIndicator size="large" color="rgba(255,255,255,0.5)" />
        </View>
      ) : error ? (
        <View style={[styles.emptyState, { paddingTop: HEADER_HEIGHT + 40 }]}>
          <Ionicons name="alert-circle-outline" size={32} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyTitle}>Something went wrong</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: HEADER_HEIGHT + 20, paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {!canViewLinks ? (
            renderPrivate()
          ) : links.length === 0 ? (
            renderEmpty()
          ) : (
            <>
              <Text style={styles.sectionLabel}>LINKS</Text>
              <View style={styles.cardList}>
                {links.map((item, index) => renderLinkCard(item, index))}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // Header
  pageHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  androidHeaderBg: {
    backgroundColor: 'rgba(10,10,12,0.96)',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 8,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBlock: {
    alignItems: 'flex-start',
  },
  headerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerUsername: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: -0.1,
    marginTop: 1,
  },
  headerRight: {
    width: 36,
  },

  // Content
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.2,
    marginBottom: 12,
    marginLeft: 4,
  },
  cardList: {
    gap: 10,
  },

  // Link card
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.09)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTextBlock: {
    flex: 1,
    gap: 3,
  },
  linkPlatform: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  linkHandle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: -0.1,
  },

  // Empty / private
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
