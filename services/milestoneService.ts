import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Exercise } from '@/data/exercises';

// This interface can be shared by any component that needs it.
export interface PreviousPRData {
    weight?: number;
    reps?: number;
    distance?: number;
    duration?: number;
    level?: number;
    date?: string;
    isPR?: boolean;
}

/**
 * Fetches the best previous personal record for a given user and exercise.
 * @param userId The ID of the current user.
 * @param exercise The exercise object to find the PR for.
 * @returns A promise that resolves to a PreviousPRData object or null.
 */
export const fetchPreviousPRService = async (userId: string, exercise: Exercise): Promise<PreviousPRData | null> => {
    try {
        const q = query(
            collection(db, 'posts'),
            where('authorId', '==', userId),
            where('isMilestone', '==', true),
            where('milestoneDetails.exerciseId', '==', exercise.id)
        );

        const querySnapshot = await getDocs(q);
        const milestones = querySnapshot.docs.map(doc => doc.data().milestoneDetails);

        if (milestones.length === 0) {
            return null;
        }

        let bestPR: any = null;

        switch (exercise.metricType) {
            case 'weight_reps':
                bestPR = milestones.reduce((best, current) => {
                    if (current.value == null || current.reps == null) return best;
                    const currentVolume = current.value * current.reps;
                    if (!best) return current;
                    const bestVolume = (best.value || 0) * (best.reps || 0);
                    return currentVolume > bestVolume ? current : best;
                }, null);
                break;
            case 'bodyweight_reps':
                bestPR = milestones.reduce((best, current) => {
                    if (current.reps == null) return best;
                    return !best || current.reps > (best.reps || 0) ? current : best;
                }, null);
                break;
            case 'distance':
                bestPR = milestones.reduce((best, current) => {
                    if (current.value == null) return best;
                    return !best || current.value > (best.value || 0) ? current : best;
                }, null);
                break;
            case 'duration':
                bestPR = milestones.reduce((best, current) => {
                    if (current.duration == null) return best;
                    return !best || current.duration > (best.duration || 0) ? current : best;
                }, null);
                break;
            case 'distance_time':
                bestPR = milestones.reduce((best, current) => {
                    if (current.duration == null || current.value == null || current.value === 0) return best;
                    const currentPace = current.duration / current.value;
                    if (!best) return current;
                    const bestPace = (best.duration || 0) / (best.value || 1);
                    return currentPace < bestPace ? current : best;
                }, null);
                break;
            case 'duration_level':
                bestPR = milestones.reduce((best, current) => {
                    if (current.level == null || current.duration == null) return best;
                    if (!best) return current;
                    if (current.level > (best.level || 0)) return current;
                    if (current.level === (best.level || 0) && current.duration > (best.duration || 0)) return current;
                    return best;
                }, null);
                break;
            default:
                bestPR = null;
        }

        if (bestPR) {
            const prData: PreviousPRData = {
                weight: bestPR.value,
                reps: bestPR.reps,
                distance: bestPR.value,
                duration: bestPR.duration,
                level: bestPR.level,
                date: bestPR.achievedAt ? new Date(bestPR.achievedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
                isPR: true,
            };
            return prData;
        }

        return null;

    } catch (error) {
        console.error("Error fetching previous PR from service:", error);
        return null;
    }
};