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

export interface WorkoutDraft {
  title: string;
  description: string;
  visibility: 'public' | 'followers' | 'private';
  segments: WorkoutDraftSegment[];
}
