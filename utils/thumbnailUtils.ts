/**
 * Get the optimal image URL - prefers thumbnail if available, falls back to full image
 * @param thumbnailUrl - Thumbnail URL (optimized, smaller)
 * @param imageUrl - Full image URL (higher quality)
 * @returns The optimal URL to use, or undefined if neither available
 */
export function getOptimalImageUrl(
  thumbnailUrl: string | null | undefined,
  imageUrl: string | null | undefined
): string | undefined {
  return thumbnailUrl || imageUrl || undefined;
}
