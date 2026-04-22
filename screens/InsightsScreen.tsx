/**
 * InsightsScreen — dedicated analytics dashboard for the user's own workout
 * data. Reads workout_logs + exercise_history client-side, derives the same
 * 4 chart shapes the AI coach emits, and renders them as always-on cards.
 */
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT_COLOR } from '@/constants/Colors';
import { useInsights } from '@/features/insights/ui/useInsights';
import { ProgressChartCard } from '@/components/ai/cards/ProgressChartCard';
import { VolumeBreakdownCard } from '@/components/ai/cards/VolumeBreakdownCard';
import { StrengthCurveCard } from '@/components/ai/cards/StrengthCurveCard';
import { MuscleBalanceCard } from '@/components/ai/cards/MuscleBalanceCard';

export default function InsightsScreen() {
  const router = useRouter();
  const { data, loading, refreshing, error, refresh, hasAnyData } = useInsights();

  const goToCoach = useCallback(() => {
    router.push('/ai-chat');
  }, [router]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="stats-chart" size={18} color={ACCENT_COLOR} />
          <Text style={styles.headerTitle}>Insights</Text>
        </View>
        <TouchableOpacity onPress={goToCoach} style={styles.headerBtn}>
          <Ionicons name="sparkles" size={22} color="#d466ff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={ACCENT_COLOR}
          />
        }
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={ACCENT_COLOR} />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={refresh} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : !hasAnyData ? (
          <EmptyState onAskCoach={goToCoach} />
        ) : (
          <>
            <Text style={styles.sectionHint}>
              Your training, at a glance. Ask Coach for deeper analysis.
            </Text>
            {data.progress ? <ProgressChartCard data={data.progress} /> : null}
            {data.volume ? <VolumeBreakdownCard data={data.volume} /> : null}
            {data.strength ? <StrengthCurveCard data={data.strength} /> : null}
            {data.balance ? <MuscleBalanceCard data={data.balance} /> : null}
            <TouchableOpacity onPress={goToCoach} style={styles.ctaCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>Ask Coach</Text>
                <Text style={styles.ctaSubtitle}>
                  Want a custom chart or breakdown? Just ask.
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={22} color={ACCENT_COLOR} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const EmptyState: React.FC<{ onAskCoach: () => void }> = ({ onAskCoach }) => (
  <View style={styles.empty}>
    <Ionicons name="bar-chart-outline" size={56} color="#333" />
    <Text style={styles.emptyTitle}>No stats yet</Text>
    <Text style={styles.emptySubtitle}>
      Log a few workouts and your progress charts, volume breakdown, and muscle balance
      will appear here.
    </Text>
    <TouchableOpacity onPress={onAskCoach} style={styles.emptyBtn}>
      <Ionicons name="sparkles" size={16} color="#fff" />
      <Text style={styles.emptyBtnText}>Ask Coach for a workout</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#222',
  },
  headerBtn: { padding: 4, minWidth: 36, alignItems: 'center' },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  scrollContent: { padding: 12, paddingBottom: 32 },
  sectionHint: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
    marginHorizontal: 4,
  },
  loading: { marginTop: 80, alignItems: 'center' },
  errorBox: {
    marginTop: 40,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ACCENT_COLOR,
    backgroundColor: '#1a0000',
    alignItems: 'center',
    gap: 12,
  },
  errorText: { color: ACCENT_COLOR, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ACCENT_COLOR,
  },
  retryText: { color: ACCENT_COLOR, fontWeight: '600' },
  empty: {
    marginTop: 80,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: ACCENT_COLOR,
  },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 85, 0.3)',
    backgroundColor: 'rgba(255, 45, 85, 0.06)',
  },
  ctaTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  ctaSubtitle: { color: '#888', fontSize: 13, marginTop: 2 },
});
