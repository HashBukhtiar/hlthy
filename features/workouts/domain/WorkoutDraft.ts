export interface WorkoutDraftExercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
}

export interface WorkoutDraftSegment {
  id: string;
  name: string;
  length: string;
  exercises: WorkoutDraftExercise[];
}

import { MentionData } from '@/features/mentions/domain/Mention';

export interface WorkoutDraft {
  title: string;
  description: string;
  visibility: 'public' | 'followers' | 'private';
  segments: WorkoutDraftSegment[];
  mentions?: MentionData[];
  tags?: string[];
}
