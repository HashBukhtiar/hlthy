/** Workout data used for list display (cards, carousels, search results). */
export interface WorkoutListItem {
  id: string;
  title: string;
  creatorId: string;
  creatorUsername: string;
  coverImageUrl: string | null;
  thumbnailUrl: string | null;
  savedCount: number;
  isPublic?: boolean;
}
