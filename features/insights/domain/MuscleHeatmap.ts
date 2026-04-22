/**
 * Domain types for the muscle heatmap — a body-silhouette visualization
 * that tints each muscle region by how much recent training volume it's
 * absorbed.
 */

export type MuscleView = 'front' | 'back';

// 15 muscle regions — stylized, not anatomically exhaustive.
export type MuscleId =
  // Front
  | 'chest'
  | 'shoulders_front'
  | 'biceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'quads'
  // Back
  | 'traps'
  | 'shoulders_rear'
  | 'triceps'
  | 'lats'
  | 'lower_back'
  | 'glutes'
  | 'hamstrings'
  | 'calves';

export interface MuscleHeatEntry {
  muscleId: MuscleId;
  /** Aggregated weighted volume (primary full, secondary half). */
  volume: number;
  /** Distinct workout sessions that touched this muscle. */
  sessions: number;
  /** Normalized [0, 1] against the hottest muscle in the window. */
  intensity: number;
  /** When the user last trained this muscle (ISO date), or null. */
  lastTrained: string | null;
}

export interface MuscleHeatmapData {
  title: string;
  period_label?: string;
  unit: string;
  entries: Partial<Record<MuscleId, MuscleHeatEntry>>;
  /** Max volume in the window — useful for the legend scale. */
  maxVolume: number;
}
