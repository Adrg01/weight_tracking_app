// Insights screen — personalized insights and tips

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/Colors';
import { formatWeight, fromKg } from '@/lib/units';
import { getBestMeasurementTime } from '@/lib/bayesian';
import SwipeableTab from '@/components/SwipeableTab';

export default function InsightsScreen() {
  const {
    resolvedTheme,
    measurements,
    bayesianResult,
    bayesianState,
    currentTip,
    refreshTip,
    weightUnit,
    user,
  } = useApp();
  const colors = Colors[resolvedTheme];

  const insights = generateInsights();

  function generateInsights(): Array<{
    title: string;
    text: string;
    type: 'info' | 'positive' | 'warning';
  }> {
    const result: Array<{ title: string; text: string; type: 'info' | 'positive' | 'warning' }> = [];

    if (measurements.length === 0) return result;

    // Consistency insight
    const last7Days = new Set<string>();
    const now = new Date();
    measurements.forEach(m => {
      const d = new Date(m.measured_at);
      const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diff < 7) last7Days.add(m.measured_at.split('T')[0]);
    });
    const daysLogged = last7Days.size;
    if (daysLogged >= 5) {
      result.push({
        title: 'Great Consistency!',
        text: `You've logged ${daysLogged}/7 days this week. Consistency is key to accurate tracking.`,
        type: 'positive',
      });
    } else if (daysLogged < 3 && measurements.length > 3) {
      result.push({
        title: 'Log More Often',
        text: `Only ${daysLogged}/7 days logged this week. More data points = more accurate estimates.`,
        type: 'warning',
      });
    }

    // Variance insight
    if (bayesianResult && bayesianResult.confidence < 0.5) {
      result.push({
        title: 'High Confidence',
        text: `Your estimated weight confidence is \u00B1${fromKg(bayesianResult.confidence, weightUnit).toFixed(2)} ${weightUnit}. The more you log, the more precise this gets.`,
        type: 'positive',
      });
    }

    // Best time insight
    if (bayesianState && bayesianState.totalMeasurements >= 5) {
      const bestTime = getBestMeasurementTime(bayesianState);
      result.push({
        title: 'Optimal Weigh-in Time',
        text: `Your most reliable readings come at ${bestTime.formatted}. Try to weigh in around this time.`,
        type: 'info',
      });
    }

    // Time-of-day offset insight
    if (bayesianState && bayesianState.totalMeasurements >= 10) {
      const morningOffset = bayesianState.hourOffsets[7]?.mean ?? 0;
      const eveningOffset = bayesianState.hourOffsets[20]?.mean ?? 0;
      const diff = eveningOffset - morningOffset;
      if (diff > 0.3) {
        result.push({
          title: 'Daily Weight Swing',
          text: `Your weight typically increases by ${fromKg(diff, weightUnit).toFixed(1)} ${weightUnit} from morning to evening. This is normal — Scaley accounts for this in your estimate.`,
          type: 'info',
        });
      }
    }

    // Weekly trend
    if (measurements.length >= 7) {
      const recentWeek = measurements.slice(0, Math.min(7, measurements.length));
      const olderWeek = measurements.slice(
        Math.min(7, measurements.length),
        Math.min(14, measurements.length)
      );

      if (olderWeek.length > 0) {
        const recentAvg = recentWeek.reduce((s, m) => s + m.weight_kg, 0) / recentWeek.length;
        const olderAvg = olderWeek.reduce((s, m) => s + m.weight_kg, 0) / olderWeek.length;
        const change = recentAvg - olderAvg;

        if (Math.abs(change) > 0.2) {
          const direction = change < 0 ? 'lost' : 'gained';
          const isGood = user?.goal_weight_kg
            ? (change < 0 && recentAvg > user.goal_weight_kg) ||
              (change > 0 && recentAvg < user.goal_weight_kg)
            : change < 0;

          result.push({
            title: 'Weekly Change',
            text: `You've ${direction} ~${formatWeight(Math.abs(change), weightUnit)} compared to the previous week.`,
            type: isGood ? 'positive' : 'warning',
          });
        }
      }
    }

    // Rate of change warning
    if (measurements.length >= 14) {
      const twoWeeksAgo = measurements.slice(0, 14);
      const first = twoWeeksAgo[twoWeeksAgo.length - 1].weight_kg;
      const last = twoWeeksAgo[0].weight_kg;
      const weeklyRate = (last - first) / 2;

      if (weeklyRate < -1.0) {
        result.push({
          title: 'Slow Down',
          text: `You're losing more than 1 kg/week. Rapid weight loss can lead to muscle loss and nutrient deficiencies. Aim for 0.5-1 kg/week.`,
          type: 'warning',
        });
      }
    }

    // Goal proximity
    if (user?.goal_weight_kg && bayesianResult) {
      const remaining = Math.abs(bayesianResult.estimatedTrueWeight - user.goal_weight_kg);
      if (remaining < 2) {
        result.push({
          title: 'Almost There!',
          text: `You're only ${formatWeight(remaining, weightUnit)} away from your goal. Keep going!`,
          type: 'positive',
        });
      }
    }

    return result;
  }

  return (
    <SwipeableTab currentIndex={2}>
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      {/* Daily tip card */}
      {currentTip && (
        <TouchableOpacity
          style={[styles.tipCard, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '30' }]}
          onPress={refreshTip}
          activeOpacity={0.7}>
          <View style={[styles.tipBadge, { backgroundColor: colors.tint }]}>
            <Text style={styles.tipBadgeText}>{currentTip.category.toUpperCase()}</Text>
          </View>
          <Text style={[styles.tipText, { color: colors.text }]}>{currentTip.text}</Text>
          <Text style={[styles.tapHint, { color: colors.textSecondary }]}>Tap for another tip</Text>
        </TouchableOpacity>
      )}

      {/* Section header */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Insights</Text>

      {insights.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Keep Logging!</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Personalized insights will appear here as you log more weight data.
            Try to log at least once a day for the best experience.
          </Text>
        </View>
      ) : (
        insights.map((insight, i) => {
          const typeColor =
            insight.type === 'positive'
              ? colors.positive
              : insight.type === 'warning'
                ? colors.warning
                : colors.tint;

          return (
            <View
              key={i}
              style={[
                styles.insightCard,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderLeftColor: typeColor },
              ]}>
              <Text style={[styles.insightTitle, { color: colors.text }]}>{insight.title}</Text>
              <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                {insight.text}
              </Text>
            </View>
          );
        })
      )}

      {/* Stats summary */}
      {measurements.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Stats</Text>
          <View style={[styles.statsGrid]}>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>{measurements.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Logs</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {(() => {
                  const dates = new Set(measurements.map(m => m.measured_at.split('T')[0]));
                  return dates.size;
                })()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Days Tracked</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatWeight(
                  Math.min(...measurements.map(m => m.weight_kg)),
                  weightUnit,
                  1
                )}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Lowest</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatWeight(
                  Math.max(...measurements.map(m => m.weight_kg)),
                  weightUnit,
                  1
                )}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Highest</Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
    </SwipeableTab>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  tipCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  tipBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 10,
  },
  tipBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  tipText: { fontSize: 15, lineHeight: 22 },
  tapHint: { fontSize: 12, marginTop: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  insightCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 10,
  },
  insightTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  insightText: { fontSize: 14, lineHeight: 20 },
  emptyCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    flexGrow: 1,
  },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 4 },
});
