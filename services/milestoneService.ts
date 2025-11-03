import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Exercise } from '@/data/exercises';

// This interface can be shared by any component that needs it.
export interface PreviousPRData {
  date: string;
  isPR: boolean;
  weight?: number;
  weightUnit?: string;
  reps?: number;
  duration?: number;
  distance?: number;
  distanceUnit?: string;
  level?: string;
}

/**
 * Fetches the user's last known weight from their most recent weight milestone
 * @param userId The ID of the user
 * @returns The last weight value and unit, or null if none found
 */
export const fetchLastKnownWeight = async (userId: string): Promise<{ weight: number; unit: string } | null> => {
    try {
        console.log('=== fetchLastKnownWeight called for user:', userId);
        
        // First, try to get all milestone posts without orderBy to avoid index requirements
        const q = query(
            collection(db, 'posts'),
            where('authorId', '==', userId),
            where('isMilestone', '==', true)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log('❌ No milestone posts found for user');
            return null;
        }

        console.log(`✅ Found ${querySnapshot.docs.length} total milestone posts`);

        // Find all weight milestones and sort them manually
        const weightMilestones: Array<{ weight: number; unit: string; createdAt: any; docId: string }> = [];

        for (const doc of querySnapshot.docs) {
            const data = doc.data();
            const milestoneType = data.milestoneDetails?.type;
            
            console.log(`📄 Post ${doc.id}: type=${milestoneType}, hasDetails=${!!data.milestoneDetails}`);
            
            if (milestoneType === 'weightLoss' || milestoneType === 'weightGain') {
                const newWeight = data.milestoneDetails?.newWeight;
                const newWeightUnit = data.milestoneDetails?.newWeightUnit;
                const createdAt = data.createdAt;

                console.log(`  ⚖️  Weight milestone found: weight=${newWeight}, unit=${newWeightUnit}, createdAt=${createdAt}`);

                if (newWeight && newWeightUnit) {
                    weightMilestones.push({
                        weight: newWeight,
                        unit: newWeightUnit,
                        createdAt: createdAt,
                        docId: doc.id
                    });
                } else {
                    console.log('  ⚠️  Weight milestone missing data: newWeight or newWeightUnit is null');
                }
            }
        }

        console.log(`🎯 Found ${weightMilestones.length} weight milestones total`);

        if (weightMilestones.length === 0) {
            console.log('❌ No previous weight milestones found for user');
            return null;
        }

        // Sort by createdAt descending (most recent first)
        weightMilestones.sort((a, b) => {
            // Handle Firestore timestamps
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : a.createdAt?.getTime ? a.createdAt.getTime() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : b.createdAt?.getTime ? b.createdAt.getTime() : 0;
            return timeB - timeA;
        });

        const mostRecent = weightMilestones[0];
        console.log('✅ Most recent weight milestone:', {
            docId: mostRecent.docId,
            weight: mostRecent.weight,
            unit: mostRecent.unit,
            createdAt: mostRecent.createdAt
        });
        
        return {
            weight: mostRecent.weight,
            unit: mostRecent.unit
        };
    } catch (error) {
        console.error('❌ Error fetching last known weight:', error);
        return null;
    }
};

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

        console.log("Fetched milestone details from service:", milestones);

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
                date: bestPR.achievedAt ? bestPR.achievedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
                isPR: true,
            };

            switch (exercise.metricType) {
                case 'weight_reps':
                    prData.weight = bestPR.value;
                    prData.weightUnit = bestPR.weightUnit;
                    prData.reps = bestPR.reps;
                    break;
                case 'bodyweight_reps':
                    prData.reps = bestPR.reps;
                    break;
                case 'distance':
                    prData.distance = bestPR.value;
                    prData.distanceUnit = bestPR.weightUnit;
                    break;
                case 'duration':
                    prData.duration = bestPR.duration;
                    break;
                case 'distance_time':
                    prData.distance = bestPR.value;
                    prData.distanceUnit = bestPR.weightUnit;
                    prData.duration = bestPR.duration;
                    break;
                case 'duration_level':
                    prData.duration = bestPR.duration;
                    prData.level = bestPR.level;
                    break;
            }
            
            console.log("Returning Previous PR Data from service:", prData);
            return prData;
        }

        return null;

    } catch (error) {
        console.error("Error fetching previous PR from service:", error);
        return null;
    }
};