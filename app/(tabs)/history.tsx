// History screen — shows all weight measurements with trend visualization

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/Colors';
import { formatWeight, fromKg } from '@/lib/units';
import SwipeableTab from '@/components/SwipeableTab';
import { calculateTrend } from '@/lib/bayesian';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 180;
const CHART_PADDING = 16;

type TimeRange = '7d' | '30d' | '90d' | 'all';

export default function HistoryScreen() {
  const { resolvedTheme, measurements, weightUnit, removeWeight } = useApp();
  const colors = Colors[resolvedTheme];
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const filteredMeasurements = (() => {
    if (timeRange === 'all') return measurements;
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return measurements.filter(m => new Date(m.measured_at) >= cutoff);
  })();

  // Prepare chart data (chronological)
  const chartData = [...filteredMeasurements]
    .reverse()
    .map(m => ({
      date: m.measured_at.split('T')[0],
      weight: m.weight_kg,
    }));

  const trendData = calculateTrend(chartData);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Measurement', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeWeight(id),
      },
    ]);
  };

  // Simple SVG-like chart using Views
  const renderChart = () => {
    if (chartData.length < 2) return null;

    const weights = chartData.map(d => fromKg(d.weight, weightUnit));
    const min = Math.min(...weights) - 0.5;
    const max = Math.max(...weights) + 0.5;
    const range = max - min || 1;
    const chartWidth = SCREEN_WIDTH - 32 - CHART_PADDING * 2;

    return (
      <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <Text style={[styles.chartTitle, { color: colors.textSecondary }]}>Weight Trend</Text>

        <View style={[styles.chartContainer, { height: CHART_HEIGHT }]}>
          {/* Y-axis labels */}
          <View style={styles.yAxis}>
            <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>
              {max.toFixed(1)}
            </Text>
            <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>
              {((max + min) / 2).toFixed(1)}
            </Text>
            <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>
              {min.toFixed(1)}
            </Text>
          </View>

          {/* Chart area */}
          <View style={styles.chartArea}>
            {/* Grid lines */}
            {[0, 0.5, 1].map(ratio => (
              <View
                key={ratio}
                style={[
                  styles.gridLine,
                  { top: `${ratio * 100}%`, backgroundColor: colors.surfaceBorder },
                ]}
              />
            ))}

            {/* Data points */}
            {weights.map((w, i) => {
              const x = (i / (weights.length - 1)) * 100;
              const y = (1 - (w - min) / range) * 100;
              return (
                <View
                  key={i}
                  style={[
                    styles.dataPoint,
                    {
                      left: `${x}%`,
                      top: `${y}%`,
                      backgroundColor: colors.tint,
                    },
                  ]}
                />
              );
            })}

            {/* Trend line points */}
            {trendData.map((d, i) => {
              const x = (i / (trendData.length - 1)) * 100;
              const tw = fromKg(d.trend, weightUnit);
              const y = (1 - (tw - min) / range) * 100;
              return (
                <View
                  key={`t${i}`}
                  style={[
                    styles.trendPoint,
                    {
                      left: `${x}%`,
                      top: `${y}%`,
                      backgroundColor: colors.positive,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.tint }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Raw</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.positive }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Trend</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderMeasurement = ({ item }: { item: typeof measurements[0] }) => {
    const date = new Date(item.measured_at);
    const dateStr = date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    const timeStr = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity
        style={[styles.measurementRow, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        onLongPress={() => handleDelete(item.id)}
        delayLongPress={500}>
        <View style={styles.measurementLeft}>
          <Text style={[styles.measurementWeight, { color: colors.text }]}>
            {formatWeight(item.weight_kg, weightUnit)}
          </Text>
          {item.note && (
            <Text style={[styles.measurementNote, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.note}
            </Text>
          )}
        </View>
        <View style={styles.measurementRight}>
          <Text style={[styles.measurementDate, { color: colors.textSecondary }]}>{dateStr}</Text>
          <Text style={[styles.measurementTime, { color: colors.textSecondary }]}>{timeStr}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SwipeableTab currentIndex={1}>
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Time range selector */}
      <View style={styles.rangeRow}>
        {(['7d', '30d', '90d', 'all'] as TimeRange[]).map(range => (
          <TouchableOpacity
            key={range}
            style={[
              styles.rangeButton,
              { borderColor: colors.surfaceBorder },
              timeRange === range && { backgroundColor: colors.tint, borderColor: colors.tint },
            ]}
            onPress={() => setTimeRange(range)}>
            <Text
              style={[
                styles.rangeButtonText,
                { color: colors.text },
                timeRange === range && { color: '#fff' },
              ]}>
              {range === 'all' ? 'All' : range}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredMeasurements}
        keyExtractor={item => item.id}
        renderItem={renderMeasurement}
        ListHeaderComponent={renderChart}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No measurements yet. Start logging your weight!
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </View>
    </SwipeableTab>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    paddingBottom: 8,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 20,
    alignItems: 'center',
  },
  rangeButtonText: { fontSize: 13, fontWeight: '600' },
  listContent: { padding: 16, paddingTop: 0, paddingBottom: 32 },
  chartCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  chartTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  chartContainer: { flexDirection: 'row' },
  yAxis: { width: 40, justifyContent: 'space-between', paddingVertical: 4 },
  axisLabel: { fontSize: 10 },
  chartArea: { flex: 1, position: 'relative' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1 },
  dataPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -4,
    marginTop: -4,
  },
  trendPoint: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginLeft: -2.5,
    marginTop: -2.5,
    opacity: 0.7,
  },
  legend: { flexDirection: 'row', gap: 16, marginTop: 12, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12 },
  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  measurementLeft: { flex: 1 },
  measurementWeight: { fontSize: 18, fontWeight: '600' },
  measurementNote: { fontSize: 13, marginTop: 2 },
  measurementRight: { alignItems: 'flex-end' },
  measurementDate: { fontSize: 13, fontWeight: '500' },
  measurementTime: { fontSize: 12, marginTop: 2 },
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
