/**
 * Pure projections that turn validated structured payloads into typed
 * AIMessageWrite fragments ready for Firestore.
 *
 * Living in features/ai/ui because it's called from useAIChat and the schema
 * shapes it projects into (AIMessageWrite) are UI-layer concerns. Pure & sync
 * so unit-testable without mocking the hook.
 */
import type { AIMessageWrite } from '@/features/ai/domain/AIMessage';
import type { ProgressChartData } from '@/features/ai/domain/ProgressChart';
import type { VolumeBreakdownData } from '@/features/ai/domain/VolumeBreakdown';
import type { StrengthCurveData } from '@/features/ai/domain/StrengthCurve';
import type { MuscleBalanceData } from '@/features/ai/domain/MuscleBalance';

// Mirror of server-side cap in ai/models/schemas.py — we trim again before
// write in case a future backend change relaxes it.
const STRENGTH_CURVE_MAX_POINTS = 80;

type Write = Pick<
  AIMessageWrite,
  'chartData' | 'volumeData' | 'strengthCurveData' | 'balanceData'
>;

export function projectProgressChart(c: ProgressChartData): Pick<Write, 'chartData'> {
  return {
    chartData: {
      title: c.title,
      metric: c.metric,
      unit: c.unit,
      series: c.series.map((s) => ({
        label: s.label,
        ...(s.color ? { color: s.color } : {}),
        points: s.points.map((p) => ({ date: p.date, value: p.value })),
      })),
      ...(c.x_axis_label ? { x_axis_label: c.x_axis_label } : {}),
      ...(c.y_axis_label ? { y_axis_label: c.y_axis_label } : {}),
      ...(c.summary ? { summary: c.summary } : {}),
    },
  };
}

export function projectVolumeBreakdown(v: VolumeBreakdownData): Pick<Write, 'volumeData'> {
  return {
    volumeData: {
      title: v.title,
      unit: v.unit,
      entries: v.entries.map((e) => ({
        label: e.label,
        value: e.value,
        ...(e.color ? { color: e.color } : {}),
      })),
      ...(v.total !== undefined ? { total: v.total } : {}),
      ...(v.prior_total !== undefined ? { prior_total: v.prior_total } : {}),
      ...(v.period_label ? { period_label: v.period_label } : {}),
      ...(v.summary ? { summary: v.summary } : {}),
    },
  };
}

export function projectStrengthCurve(
  s: StrengthCurveData,
): Pick<Write, 'strengthCurveData'> {
  return {
    strengthCurveData: {
      exercise_name: s.exercise_name,
      metric: s.metric,
      unit: s.unit,
      // Cap here too — prevents a misbehaving backend from landing 500-point
      // payloads in Firestore even though the card renders only the first 80.
      points: s.points.slice(0, STRENGTH_CURVE_MAX_POINTS).map((p) => ({
        date: p.date,
        value: p.value,
        ...(p.is_pr ? { is_pr: true } : {}),
        ...(p.reps !== undefined ? { reps: p.reps } : {}),
      })),
      ...(s.trend_label ? { trend_label: s.trend_label } : {}),
      ...(s.projected_next !== undefined ? { projected_next: s.projected_next } : {}),
      ...(s.summary ? { summary: s.summary } : {}),
    },
  };
}

export function projectMuscleBalance(m: MuscleBalanceData): Pick<Write, 'balanceData'> {
  return {
    balanceData: {
      title: m.title,
      unit: m.unit,
      axes: m.axes.map((a) => ({
        label: a.label,
        user_value: a.user_value,
        target_value: a.target_value,
        ...(a.flag ? { flag: a.flag } : {}),
      })),
      ...(m.period_label ? { period_label: m.period_label } : {}),
      ...(m.summary ? { summary: m.summary } : {}),
    },
  };
}
