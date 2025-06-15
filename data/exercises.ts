// Sample exercise data with categories and muscle groups
export type MetricType = 'weight_reps' | 'duration' | 'distance' | 'distance_time' | 'bodyweight_reps' | 'duration_level';

export interface Exercise {
  id: string;
  name: string;
  category: 'strength' | 'cardio' | 'flexibility' | 'sports' | 'bodyweight';
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  description?: string;
  metricType: MetricType; // Type of metrics to track for this exercise
}

export const categories = [
  'strength',
  'cardio', 
  'flexibility',
  'sports',
  'bodyweight'
];

export const muscleGroups = [
  'chest',
  'back',
  'shoulders',
  'triceps',
  'biceps',
  'forearms',
  'quadriceps',
  'hamstrings',
  'calves',
  'glutes',
  'abs',
  'obliques',
  'lower back',
  'traps',
  'lats'
];

export const exercises: Exercise[] = [
  {
    id: '1',
    name: 'Bench Press',
    category: 'strength',
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['shoulders'],
    equipment: ['barbell', 'bench'],
    description: 'Lie on a bench and press a barbell upward from your chest',
    metricType: 'weight_reps'
  },
  {
    id: '2',
    name: 'Squat',
    category: 'strength',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings', 'lower back'],
    equipment: ['barbell', 'squat rack'],
    description: 'Perform a full squat with a barbell on your shoulders',
    metricType: 'weight_reps'
  },
  {
    id: '3',
    name: 'Deadlift',
    category: 'strength',
    primaryMuscles: ['hamstrings', 'lower back'],
    secondaryMuscles: ['glutes', 'traps', 'forearms'],
    equipment: ['barbell'],
    description: 'Lift a barbell from the ground to hip level',
    metricType: 'weight_reps'
  },
  {
    id: '4',
    name: 'Pull-up',
    category: 'bodyweight',
    primaryMuscles: ['back', 'biceps'],
    secondaryMuscles: ['forearms', 'shoulders'],
    equipment: ['pull-up bar'],
    description: 'Lift your body upward while hanging from a bar',
    metricType: 'bodyweight_reps'
  },
  {
    id: '5',
    name: 'Running',
    category: 'cardio',
    primaryMuscles: ['quadriceps', 'hamstrings'],
    secondaryMuscles: ['calves', 'glutes'],
    equipment: ['running shoes'],
    description: 'Run at a steady pace or intervals',
    metricType: 'distance_time'
  },
  {
    id: '6',
    name: 'Yoga Flow',
    category: 'flexibility',
    primaryMuscles: ['full body'],
    secondaryMuscles: [],
    equipment: ['yoga mat'],
    description: 'A sequence of yoga poses designed to improve flexibility',
    metricType: 'duration'
  },
  {
    id: '7',
    name: 'Basketball',
    category: 'sports',
    primaryMuscles: ['full body'],
    secondaryMuscles: [],
    equipment: ['basketball'],
    description: 'Playing basketball in a competitive or casual setting',
    metricType: 'duration'
  },
  {
    id: '8',
    name: 'Dumbbell Shoulder Press',
    category: 'strength',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['triceps'],
    equipment: ['dumbbells'],
    description: 'Press dumbbells upward from shoulder level',
    metricType: 'weight_reps'
  },
  {
    id: '9',
    name: 'Lat Pulldown',
    category: 'strength',
    primaryMuscles: ['back', 'lats'],
    secondaryMuscles: ['biceps'],
    equipment: ['cable machine'],
    description: 'Pull a cable attachment down to chest level',
    metricType: 'weight_reps'
  },
  {
    id: '10',
    name: 'Leg Press',
    category: 'strength',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: ['leg press machine'],
    description: 'Press weight away using your legs while seated',
    metricType: 'weight_reps'
  },
  {
    id: '11',
    name: 'Plank',
    category: 'bodyweight',
    primaryMuscles: ['abs', 'core'],
    secondaryMuscles: ['shoulders'],
    equipment: [],
    description: 'Hold body in a straight line supported by forearms and toes',
    metricType: 'duration'
  },
  {
    id: '12',
    name: 'Tricep Dips',
    category: 'bodyweight',
    primaryMuscles: ['triceps'],
    secondaryMuscles: ['shoulders', 'chest'],
    equipment: ['dip bars', 'bench'],
    description: 'Lower and raise your body using your arms on parallel bars',
    metricType: 'bodyweight_reps'
  },
  {
    id: '13',
    name: 'Push-ups',
    category: 'bodyweight',
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['shoulders', 'core'],
    equipment: [],
    description: 'Lower and raise your body using your arms while in plank position',
    metricType: 'bodyweight_reps'
  },
  {
    id: '14',
    name: 'Rowing Machine',
    category: 'cardio',
    primaryMuscles: ['back', 'arms'],
    secondaryMuscles: ['legs', 'core'],
    equipment: ['rowing machine'],
    description: 'Full body cardio using a rowing ergometer',
    metricType: 'distance_time'
  },
  {
    id: '15',
    name: 'Cycling',
    category: 'cardio',
    primaryMuscles: ['quadriceps', 'hamstrings'],
    secondaryMuscles: ['calves'],
    equipment: ['bicycle', 'stationary bike'],
    description: 'Cycling outdoors or using a stationary bike',
    metricType: 'distance_time'
  },
];