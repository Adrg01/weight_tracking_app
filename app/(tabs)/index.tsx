// Dashboard — main screen with weight summary, chart, BMI, tips, and FAB for logging

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/Colors';
import { formatWeight, calculateBMI, getBMICategory, fromKg } from '@/lib/units';
import { getBestMeasurementTime, createInitialPrior, updatePosterior } from '@/lib/bayesian';
import WeightChart from '@/components/WeightChart';
import LogWeightModal from '@/components/LogWeightModal';
import SwipeableTab from '@/components/SwipeableTab';
import { BannerAd, BannerAdSize, BANNER_AD_UNIT_ID } from '@/lib/ads';

export default function DashboardScreen() {
  const {
    resolvedTheme,
    user,
    measurements,
    bayesianResult,
    bayesianState,
    currentTip,
    refreshTip,
    weightUnit,
  } = useApp();
  const colors = Colors[resolvedTheme];
  const [logModalVisible, setLogModalVisible] = useState(false);

  const latestWeight = measurements.length > 0 ? measurements[0].weight_kg : null;
  const estimatedWeight = bayesianResult?.estimatedTrueWeight ?? null;
  const confidence = bayesianResult?.confidence ?? null;

  const bmi = latestWeight && user?.height_cm
    ? calculateBMI(estimatedWeight ?? latestWeight, user.height_cm)
    : null;
  const bmiCategory = bmi ? getBMICategory(bmi) : null;

  const bestTime = bayesianState ? getBestMeasurementTime(bayesianState) : null;

  // Prepare chart data: for each measurement, compute the running Bayesian estimate
  const chartData = useMemo(() => {
    if (measurements.length < 2) return [];

    const chronological = [...measurements].reverse();
    const points: Array<{ date: string; rawWeight: number; estimatedWeight?: number }> = [];

    let state = createInitialPrior(chronological[0]?.weight_kg);

    for (const m of chronological) {
      const mData = { weightKg: m.weight_kg, measuredAt: new Date(m.measured_at) };
      const result = updatePosterior(state, mData);
      state = result.state;

      points.push({
        date: m.measured_at,
        rawWeight: m.weight_kg,
        estimatedWeight: result.estimatedTrueWeight,
      });
    }

    return points;
  }, [measurements]);

  return (
    <SwipeableTab currentIndex={0}>
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}>
        {/* Main weight card */}
        <View style={[styles.card, styles.mainCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          {estimatedWeight ? (
            <>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                Estimated True Weight
              </Text>
              <Text style={[styles.mainWeight, { color: colors.text }]}>
                {formatWeight(estimatedWeight, weightUnit)}
              </Text>
              {confidence != null && (
                <Text style={[styles.confidence, { color: colors.textSecondary }]}>
                  {'\u00B1'} {fromKg(confidence, weightUnit).toFixed(2)} {weightUnit}
                </Text>
              )}
              {latestWeight != null && (
                <Text style={[styles.rawWeight, { color: colors.textSecondary }]}>
                  Last reading: {formatWeight(latestWeight, weightUnit)}
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                Current Weight
              </Text>
              {latestWeight ? (
                <Text style={[styles.mainWeight, { color: colors.text }]}>
                  {formatWeight(latestWeight, weightUnit)}
                </Text>
              ) : (
                <Text style={[styles.noData, { color: colors.textSecondary }]}>
                  Tap + to log your first weight
                </Text>
              )}
            </>
          )}
        </View>

        {/* BMI Card */}
        {bmi != null && bmiCategory && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>BMI</Text>
            <View style={styles.bmiRow}>
              <Text style={[styles.bmiValue, { color: colors.text }]}>{bmi.toFixed(1)}</Text>
              <View style={[styles.bmiTag, { backgroundColor: colors[bmiCategory.color] + '20' }]}>
                <Text style={[styles.bmiTagText, { color: colors[bmiCategory.color] }]}>
                  {bmiCategory.label}
                </Text>
              </View>
            </View>
            {/* BMI scale: range 15–40, segments match real category boundaries */}
            {/* 15-18.5 (3.5) | 18.5-25 (6.5) | 25-30 (5) | 30-40 (10) = total 25 */}
            <View style={styles.bmiScaleContainer}>
              {/* Red triangle pointer positioned by BMI value */}
              <View style={[styles.bmiPointerRow, { left: `${Math.min(97, Math.max(3, ((bmi - 15) / 25) * 100))}%` }]}>
                <View style={styles.bmiPointer} />
              </View>
              <View style={styles.bmiScale}>
                <View style={[styles.bmiSegment, { backgroundColor: colors.warning + '40', flex: 3.5 }]} />
                <View style={[styles.bmiSegment, { backgroundColor: colors.positive + '40', flex: 6.5 }]} />
                <View style={[styles.bmiSegment, { backgroundColor: colors.warning + '40', flex: 5 }]} />
                <View style={[styles.bmiSegment, { backgroundColor: colors.negative + '40', flex: 10 }]} />
              </View>
            </View>
            <View style={styles.bmiLabelsPositioned}>
              {/* Labels positioned at the boundaries: 15, 18.5, 25, 30, 40 */}
              <Text style={[styles.bmiLabelText, { color: colors.textSecondary, position: 'absolute', left: '0%' }]}>15</Text>
              <Text style={[styles.bmiLabelText, { color: colors.textSecondary, position: 'absolute', left: '14%', transform: [{ translateX: -6 }] }]}>18.5</Text>
              <Text style={[styles.bmiLabelText, { color: colors.textSecondary, position: 'absolute', left: '40%', transform: [{ translateX: -4 }] }]}>25</Text>
              <Text style={[styles.bmiLabelText, { color: colors.textSecondary, position: 'absolute', left: '60%', transform: [{ translateX: -4 }] }]}>30</Text>
              <Text style={[styles.bmiLabelText, { color: colors.textSecondary, position: 'absolute', right: '0%' }]}>40</Text>
            </View>
          </View>
        )}

        {/* Weight chart */}
        {chartData.length >= 2 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Weight History</Text>
            <WeightChart
              data={chartData}
              weightUnit={weightUnit}
              resolvedTheme={resolvedTheme}
              height={240}
              goalWeightKg={user?.goal_weight_kg}
            />
          </View>
        )}

        {/* Best time insight */}
        {bestTime && bayesianState && bayesianState.totalMeasurements >= 5 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Best Time to Weigh In</Text>
            <Text style={[styles.insightText, { color: colors.text }]}>{bestTime.formatted}</Text>
            <Text style={[styles.insightSubtext, { color: colors.textSecondary }]}>
              Your weight readings are most consistent at this time.
            </Text>
          </View>
        )}

        {/* Daily tip */}
        {currentTip && (
          <TouchableOpacity
            style={[styles.card, styles.tipCard, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '30' }]}
            onPress={refreshTip}
            activeOpacity={0.7}>
            <Text style={[styles.tipLabel, { color: colors.tint }]}>Daily Tip</Text>
            <Text style={[styles.tipText, { color: colors.text }]}>{currentTip.text}</Text>
            <Text style={[styles.tipRefresh, { color: colors.textSecondary }]}>Tap for another tip</Text>
          </TouchableOpacity>
        )}

        {/* Goal progress */}
        {user?.goal_weight_kg && latestWeight && (() => {
          const current = estimatedWeight ?? latestWeight;
          const remaining = Math.abs(current - user.goal_weight_kg);
          const needsToLose = current > user.goal_weight_kg;
          const direction = needsToLose ? 'lose' : current < user.goal_weight_kg ? 'gain' : null;
          const firstWeight = measurements[measurements.length - 1]?.weight_kg ?? current;
          const totalJourney = Math.abs(firstWeight - user.goal_weight_kg);
          const progress = totalJourney > 0 ? Math.min(100, Math.max(5, ((totalJourney - remaining) / totalJourney) * 100)) : 100;

          return (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Goal Progress</Text>
              <Text style={[styles.goalText, { color: colors.text }]}>
                {direction
                  ? `${formatWeight(remaining, weightUnit)} to ${needsToLose ? 'lose' : 'gain'}`
                  : 'Goal reached!'
                }
              </Text>
              <Text style={[styles.goalSubtext, { color: colors.textSecondary }]}>
                Target: {formatWeight(user.goal_weight_kg, weightUnit)}
              </Text>
              <View style={[styles.progressBar, { backgroundColor: colors.surfaceBorder }]}>
                <View
                  style={[styles.progressFill, { backgroundColor: colors.tint, width: `${progress}%` }]}
                />
              </View>
            </View>
          );
        })()}

        {/* Bottom spacer for banner + FAB */}
        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Banner ad */}
      <View style={styles.bannerContainer}>
        <BannerAd
          unitId={BANNER_AD_UNIT_ID}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        />
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={() => setLogModalVisible(true)}
        activeOpacity={0.8}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Log weight modal */}
      <LogWeightModal
        visible={logModalVisible}
        onClose={() => setLogModalVisible(false)}
      />
    </View>
    </SwipeableTab>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
  },
  mainCard: { alignItems: 'center', paddingVertical: 28 },
  cardLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  mainWeight: { fontSize: 48, fontWeight: '700' },
  confidence: { fontSize: 14, marginTop: 4 },
  rawWeight: { fontSize: 13, marginTop: 8 },
  noData: { fontSize: 16, textAlign: 'center', paddingVertical: 12 },
  bmiRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bmiValue: { fontSize: 32, fontWeight: '700' },
  bmiTag: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  bmiTagText: { fontSize: 13, fontWeight: '600' },
  bmiScaleContainer: { marginTop: 16, position: 'relative' },
  bmiPointerRow: { position: 'absolute', top: -10, zIndex: 1, transform: [{ translateX: -6 }] },
  bmiPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#E53E3E',
  },
  bmiScale: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  bmiSegment: { height: '100%' },
  bmiLabelsPositioned: { position: 'relative', height: 16, marginTop: 4 },
  bmiLabelText: { fontSize: 10 },
  insightText: { fontSize: 24, fontWeight: '700' },
  insightSubtext: { fontSize: 13, marginTop: 4 },
  tipCard: { borderWidth: 1 },
  tipLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  tipText: { fontSize: 15, lineHeight: 22 },
  tipRefresh: { fontSize: 12, marginTop: 8 },
  goalText: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  goalSubtext: { fontSize: 13, marginBottom: 12 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  bannerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '300',
    lineHeight: 48,
    marginTop: 2,
  },
});
