import React, { useState, useCallback, useEffect } from 'react';
import { Image, ImageStyle, StyleProp, View, ActivityIndicator } from 'react-native';

interface OptimizedImageProps {
  thumbnailUrl?: string | null;
  originalUrl?: string | null;
  style?: StyleProp<ImageStyle>;
  fallbackUrl?: string;
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
 * Gets the best available image URL
 */
const getBestUrl = (
  thumbnailUrl?: string | null,
  originalUrl?: string | null,
  fallbackUrl: string = DEFAULT_FALLBACK
): string => {
  if (isValidImageUrl(thumbnailUrl)) return thumbnailUrl!.trim();
  if (isValidImageUrl(originalUrl)) return originalUrl!.trim();
  return fallbackUrl;
};

/**
 * OptimizedImage component that handles thumbnail/original fallback with error recovery
 * 
 * This component:
 * 1. Prefers thumbnailUrl over originalUrl for bandwidth optimization
 * 2. Falls back to originalUrl if thumbnail fails to load
 * 3. Falls back to a default image if both fail
 * 4. Shows a loading indicator while the image loads (optional)
 */
export default function OptimizedImage({
  thumbnailUrl,
  originalUrl,
  style,
  fallbackUrl = DEFAULT_FALLBACK,
  showLoader = false,
  resizeMode = 'cover',
}: OptimizedImageProps) {
  const [currentUrl, setCurrentUrl] = useState(() => 
    getBestUrl(thumbnailUrl, originalUrl, fallbackUrl)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // Update URL when props change
  useEffect(() => {
    const newUrl = getBestUrl(thumbnailUrl, originalUrl, fallbackUrl);
    if (newUrl !== currentUrl && retryCount === 0) {
      setCurrentUrl(newUrl);
      setIsLoading(true);
    }
  }, [thumbnailUrl, originalUrl, fallbackUrl]);

  const handleError = useCallback(() => {
    console.log(`Image load failed for: ${currentUrl?.substring(0, 50)}...`);
    
    if (retryCount === 0 && isValidImageUrl(originalUrl) && currentUrl !== originalUrl) {
      // First retry: try original URL if we were using thumbnail
      console.log('Thumbnail failed, trying original URL');
      setCurrentUrl(originalUrl!.trim());
      setRetryCount(1);
      setIsLoading(true);
    } else if (retryCount <= 1 && currentUrl !== fallbackUrl) {
      // Second retry: use fallback
      console.log('Image failed, using fallback');
      setCurrentUrl(fallbackUrl);
      setRetryCount(2);
      setIsLoading(true);
    } else {
      // Give up, hide loader
      setIsLoading(false);
    }
  }, [currentUrl, originalUrl, fallbackUrl, retryCount]);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

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
        source={{ uri: currentUrl }}
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
  resizeMode = 'cover',
}: Omit<OptimizedImageProps, 'showLoader'>) {
  const [currentUrl, setCurrentUrl] = useState(() => 
    getBestUrl(thumbnailUrl, originalUrl, fallbackUrl)
  );
  const [retryCount, setRetryCount] = useState(0);

  // Update URL when props change
  useEffect(() => {
    const newUrl = getBestUrl(thumbnailUrl, originalUrl, fallbackUrl);
    if (newUrl !== currentUrl && retryCount === 0) {
      setCurrentUrl(newUrl);
    }
  }, [thumbnailUrl, originalUrl, fallbackUrl]);

  const handleError = useCallback(() => {
    if (retryCount === 0 && isValidImageUrl(originalUrl) && currentUrl !== originalUrl) {
      setCurrentUrl(originalUrl!.trim());
      setRetryCount(1);
    } else if (retryCount <= 1 && currentUrl !== fallbackUrl) {
      setCurrentUrl(fallbackUrl);
      setRetryCount(2);
    }
  }, [currentUrl, originalUrl, fallbackUrl, retryCount]);

  return (
    <Image
      source={{ uri: currentUrl }}
      style={style}
      resizeMode={resizeMode}
      onError={handleError}
    />
  );
}
