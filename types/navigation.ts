// Navigation types for Expo Router
export type ViewPostParams = {
  id: string;
  postData?: string;
};

export type ViewWorkoutParams = {
  id: string;
  workoutId?: string;
};

// Tab navigation types
export type TabParamList = {
  home: undefined;
  milestones: undefined;
};