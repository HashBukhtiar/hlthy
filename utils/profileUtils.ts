export const formatTimeAgo = (date: any): string => {
  if (!date) return 'Just now';
  const dateObj = date.toDate ? date.toDate() : new Date(date);
  
  const seconds = Math.floor((new Date().getTime() - dateObj.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const archetypeDescriptions = {
  'athlete': 'Balanced all-round athletic performance with focus on endurance and strength.',
  'bodybuilder': 'Focus on muscle hypertrophy, symmetry, and aesthetic physique development.',
  'crossfitter': 'High-intensity functional movements combining gymnastics, weightlifting, and cardio.',
  'generalist': 'Well-rounded fitness approach with balanced strength, cardio, and flexibility goals.',
  'powerlifter': 'Specialized in maximizing strength in the squat, bench press, and deadlift.',
};
