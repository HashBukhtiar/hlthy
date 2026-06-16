import React, { useState, useCallback, useEffect } from 'react';
import { Image, ImageStyle, StyleProp, View, ActivityIndicator, ImageSourcePropType } from 'react-native';

interface OptimizedImageProps {
  thumbnailUrl?: string | null;
  originalUrl?: string | null;
  style?: StyleProp<ImageStyle>;
  fallbackUrl?: string;
  /**
   * Local asset (require(...)) rendered when no remote URL is valid or all
   * remote URLs fail to load. Use this for non-avatar contexts (post/video
   * thumbnails) so they don't fall back to the profile-avatar placeholder.
   */
  fallbackSource?: ImageSourcePropType;
  showLoader?: boolean;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

const DEFAULT_FALLBACK = 'https://thumbs.dreamstime.com/b/creative-illustration-default-avatar-profile-placeholder-isolated-background-art-design-grey-photo-blank-template-mockup-144855718.jpg';

/**
 * Validates if a URL is likely still valid
 */
const isValidImageUrl = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== 'string') return false;

  const trimmed = url.trim();
  if (!trimmed) return false;

  // Check for common invalid patterns
  if (trimmed === 'undefined' || trimmed === 'null') return false;

  // Basic URL validation
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
};

/**
 * Gets the best available remote URL, or null when none is valid.
 */
const getBestRemoteUrl = (
  thumbnailUrl?: string | null,
  originalUrl?: string | null
): string | null => {
  if (isValidImageUrl(thumbnailUrl)) return thumbnailUrl!.trim();
  if (isValidImageUrl(originalUrl)) return originalUrl!.trim();
  return null;
};

/**
 * OptimizedImage component that handles thumbnail/original fallback with error recovery
 *
 * This component:
 * 1. Prefers thumbnailUrl over originalUrl for bandwidth optimization
 * 2. Falls back to originalUrl if thumbnail fails to load
 * 3. Falls back to fallbackSource (local asset) or fallbackUrl if both fail
 * 4. Shows a loading indicator while the image loads (optional)
 */
export default function OptimizedImage({
  thumbnailUrl,
  originalUrl,
  style,
  fallbackUrl = DEFAULT_FALLBACK,
  fallbackSource,
  showLoader = false,
  resizeMode = 'cover',
}: OptimizedImageProps) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(() =>
    getBestRemoteUrl(thumbnailUrl, originalUrl)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // Update URL when props change
  useEffect(() => {
    const newUrl = getBestRemoteUrl(thumbnailUrl, originalUrl);
    if (newUrl !== currentUrl && retryCount === 0) {
      setCurrentUrl(newUrl);
      setIsLoading(true);
    }
  }, [thumbnailUrl, originalUrl]);

  const handleError = useCallback(() => {
    console.log(`Image load failed for: ${currentUrl?.substring(0, 50)}...`);

    if (retryCount === 0 && isValidImageUrl(originalUrl) && currentUrl !== originalUrl!.trim()) {
      // First retry: try original URL if we were using thumbnail
      setCurrentUrl(originalUrl!.trim());
      setRetryCount(1);
      setIsLoading(true);
    } else {
      // Exhausted remote options: fall back to the local/remote placeholder
      setCurrentUrl(null);
      setRetryCount(2);
      setIsLoading(false);
    }
  }, [currentUrl, originalUrl, retryCount]);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const source: ImageSourcePropType = currentUrl
    ? { uri: currentUrl }
    : (fallbackSource ?? { uri: fallbackUrl });

  return (
    <View style={style}>
      {showLoader && isLoading && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#1c1c1e',
            zIndex: 1,
          }}
        >
          <ActivityIndicator size="small" color="#666" />
        </View>
      )}
      <Image
        source={source}
        style={[{ width: '100%', height: '100%' }, style]}
        resizeMode={resizeMode}
        onError={handleError}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
      />
    </View>
  );
}

/**
 * Lightweight version without loading indicator for lists/grids
 */
export function OptimizedImageLight({
  thumbnailUrl,
  originalUrl,
  style,
  fallbackUrl = DEFAULT_FALLBACK,
  fallbackSource,
  resizeMode = 'cover',
  onLoad,
}: Omit<OptimizedImageProps, 'showLoader'> & { onLoad?: () => void }) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(() =>
    getBestRemoteUrl(thumbnailUrl, originalUrl)
  );
  const [retryCount, setRetryCount] = useState(0);

  // Update URL when props change
  useEffect(() => {
    const newUrl = getBestRemoteUrl(thumbnailUrl, originalUrl);
    if (newUrl !== currentUrl && retryCount === 0) {
      setCurrentUrl(newUrl);
    }
  }, [thumbnailUrl, originalUrl]);

  const handleError = useCallback(() => {
    if (retryCount === 0 && isValidImageUrl(originalUrl) && currentUrl !== originalUrl!.trim()) {
      setCurrentUrl(originalUrl!.trim());
      setRetryCount(1);
    } else {
      // Exhausted remote options: fall back to the local/remote placeholder
      setCurrentUrl(null);
      setRetryCount(2);
    }
  }, [currentUrl, originalUrl, retryCount]);

  const source: ImageSourcePropType = currentUrl
    ? { uri: currentUrl }
    : (fallbackSource ?? { uri: fallbackUrl });

  return (
    <Image
      source={source}
      style={style}
      resizeMode={resizeMode}
      onError={handleError}
      onLoad={onLoad}
    />
  );
}
