/**
 * Domain types for the Insights feature — a user-facing dashboard of
 * client-side-derived workout analytics. All the downstream chart types
 * live under features/ai/domain/ since the AI coach emits the same shapes;
 * we just re-derive them locally here.
 */
export type { DerivedInsights } from '@/logic/insightsDerivation';
