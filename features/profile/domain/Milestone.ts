/** A single milestone entry extracted from a milestone post. */
export interface Milestone {
  id: string;
  postId: string;
  exerciseName?: string;
  reps?: number;
  weight?: string;
  date?: any;
  // Extended PR fields
  value?: number | string;
  weightUnit?: string;
  duration?: number;
  level?: string;
  distance?: number;
  distanceUnit?: string;
  // Weight change fields
  newWeight?: number | string;
  newWeightUnit?: string;
}

/** Milestones grouped by "Month Year" key (e.g. "January 2025"). */
export interface GroupedMilestones {
  [monthYear: string]: Milestone[];
}
