/**
 * AI Message Parsing Utilities
 * Safe parsing and type guards for AI assistant responses
 */

export type AIMessageType = 'workoutPlan' | 'techniqueAdvice' | 'schedulePlan' | 'explanation' | 'progressChart' | 'text';

// Progress-chart types live in the AI domain module; re-exported here for call sites
// that already import from utils/aiMessage.
export type {
  ProgressChartData,
  ProgressChartPoint,
  ProgressChartSeries,
  ProgressChartMetric,
} from '@/features/ai/domain/ProgressChart';
export { isProgressChartData } from '@/features/ai/domain/ProgressChart';
import type { ProgressChartData } from '@/features/ai/domain/ProgressChart';

export interface WorkoutPlanData {
  dayType: string;
  segments: Array<{
    name: string;
    exercises: Array<{
      exerciseId?: string;  // Optional - backend doesn't always provide
      exerciseName?: string;  // Frontend format
      name?: string;  // Backend format (AI uses this)
      sets: number;
      reps: number | string;
      load?: string;
      restSec?: number;
      notes?: string;
      safetyRating?: 'low' | 'medium' | 'high';
      equipmentNeeded?: string[];
    }>;
  }>;
  safetyNotes?: string;
}

export interface TechniqueAdviceData {
  issue: string;
  riskAssessment?: string;
  avoidExercises?: string[];
  safeAlternatives?: Array<{
    exerciseId: string;
    exerciseName: string;
    reason: string;
  }>;
  techniqueCues?: string[];
}

export interface SchedulePlanData {
  daysPerWeek: number;
  split: Array<{
    day: string;
    focus: string;
  }>;
  deloadGuidelines?: string[];
}

export interface ExplanationData {
  topic: string;
  keyPoints: string[];
  safetyConsiderations?: string[];
}

export interface ParsedAIMessage {
  type: AIMessageType;
  data: WorkoutPlanData | TechniqueAdviceData | SchedulePlanData | ExplanationData | ProgressChartData | null;
  text: string;
}

/**
 * Strip code fences and clean JSON
 */
function cleanJSONString(raw: string): string {
  // Remove code fences
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/\s*```/g, '');
  
  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim();
  
  // If it starts with a summary followed by JSON, try to extract just the JSON
  const jsonMatch = cleaned.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    return jsonMatch[1];
  }
  
  return cleaned;
}

/**
 * Type guards for AI response data
 */
function isWorkoutPlan(data: any): data is WorkoutPlanData {
  return data && 
    typeof data === 'object' && 
    typeof data.dayType === 'string' && 
    Array.isArray(data.segments) &&
    data.segments.every((segment: any) => 
      segment && 
      typeof segment.name === 'string' && 
      Array.isArray(segment.exercises)
    );
}

function isTechniqueAdvice(data: any): data is TechniqueAdviceData {
  return data && 
    typeof data === 'object' && 
    (typeof data.issue === 'string' || Array.isArray(data.safeAlternatives) || Array.isArray(data.techniqueCues));
}

function isSchedulePlan(data: any): data is SchedulePlanData {
  return data && 
    typeof data === 'object' && 
    typeof data.daysPerWeek === 'number' && 
    Array.isArray(data.split);
}

function isExplanation(data: any): data is ExplanationData {
  return data && 
    typeof data === 'object' && 
    typeof data.topic === 'string' && 
    Array.isArray(data.keyPoints);
}

/**
 * Main parsing function
 */
export function safeParseAssistant(rawMessage: string): ParsedAIMessage {
  // Try to find JSON in the message
  const cleanedJSON = cleanJSONString(rawMessage);
  
  try {
    // Only try to parse as JSON if it looks like JSON (starts with { or [)
    const trimmed = cleanedJSON.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const parsed = JSON.parse(cleanedJSON);
      
      // Type checking and classification
      if (isWorkoutPlan(parsed)) {
        return {
          type: 'workoutPlan',
          data: parsed,
          text: rawMessage,
        };
      } else if (isTechniqueAdvice(parsed)) {
      return {
        type: 'techniqueAdvice',
        data: parsed,
        text: rawMessage,
      };
    } else if (isSchedulePlan(parsed)) {
      return {
        type: 'schedulePlan',
        data: parsed,
        text: rawMessage,
      };
    } else if (isExplanation(parsed)) {
      return {
        type: 'explanation',
        data: parsed,
        text: rawMessage,
      };
    }
    }
  } catch (error) {
    // JSON parsing failed or didn't match any known structure
    console.log('Failed to parse AI message as structured data:', error);
  }
  
  // Fallback to plain text
  return {
    type: 'text',
    data: null,
    text: rawMessage,
  };
}

/**
 * Get exercise name from ID using exercises database
 */
export function resolveExerciseName(exerciseId: string, exercisesData?: any[]): string {
  if (!exercisesData) {
    // Fallback: convert ID to readable name
    return exerciseId
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  const exercise = exercisesData.find(ex => ex.id === exerciseId);
  return exercise?.name || exerciseId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Parse RPE from load string
 */
export function parseRPE(load?: string): number | null {
  if (!load) return null;
  
  const rpeMatch = load.match(/@RPE(\d+(?:\.\d+)?)/i);
  if (rpeMatch) {
    return parseFloat(rpeMatch[1]);
  }
  
  return null;
}

/**
 * Format rest time in human readable format
 */
export function formatRestTime(restSec?: number): string {
  if (!restSec) return 'As needed';
  
  if (restSec < 60) {
    return `${restSec}s`;
  } else {
    const minutes = Math.floor(restSec / 60);
    const seconds = restSec % 60;
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
}
