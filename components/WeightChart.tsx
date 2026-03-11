// Interactive line chart — tap to see data point values

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, Rect } from 'react-native-svg';
import Colors from '@/constants/Colors';
import { fromKg } from '@/lib/units';
import { WeightUnit } from '@/lib/units';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DataPoint {
  date: string;
  rawWeight: number;
  estimatedWeight?: number;
}

interface WeightChartProps {
  data: DataPoint[];
  weightUnit: WeightUnit;
  resolvedTheme: 'light' | 'dark';
  height?: number;
  goalWeightKg?: number | null;
}

function formatTimestamp(isoString: string): string {
  const d = new Date(isoString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const hour = d.getHours();
  const min = d.getMinutes().toString().padStart(2, '0');
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${month} ${day}, ${h}:${min} ${period}`;
}

export default function WeightChart({
  data,
  weightUnit,
  resolvedTheme,
  height = 220,
  goalWeightKg,
}: WeightChartProps) {
  const colors = Colors[resolvedTheme];
  const PADDING = { top: 28, right: 30, bottom: 30, left: 45 };
  const chartWidth = SCREEN_WIDTH - 64 - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (data.length === 0) return null;

    const rawWeights = data.map(d => fromKg(d.rawWeight, weightUnit));
    const estWeights = data
      .filter(d => d.estimatedWeight != null)
      .map(d => fromKg(d.estimatedWeight!, weightUnit));

    const goalW = goalWeightKg ? fromKg(goalWeightKg, weightUnit) : null;
    const allWeights = [...rawWeights, ...estWeights, ...(goalW ? [goalW] : [])];
    const minW = Math.min(...allWeights) - 0.5;
    const maxW = Math.max(...allWeights) + 0.5;
    const range = maxW - minW || 1;

    const scaleX = (i: number) => (i / Math.max(1, data.length - 1)) * chartWidth;
    const scaleY = (w: number) => chartHeight - ((w - minW) / range) * chartHeight;

    // Raw weight path
    const rawPath = rawWeights
      .map((w, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(w)}`)
      .join(' ');

    // Estimated weight path
    const estPoints = data
      .map((d, i) => {
        if (d.estimatedWeight == null) return null;
        const w = fromKg(d.estimatedWeight, weightUnit);
        return { x: scaleX(i), y: scaleY(w) };
      })
      .filter(Boolean) as Array<{ x: number; y: number }>;

    const estPathStr = estPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    // Raw weight points
    const rawPoints = rawWeights.map((w, i) => ({
      x: scaleX(i),
      y: scaleY(w),
      value: w,
    }));

    // Y-axis labels
    const yTicks = Array.from({ length: 5 }, (_, i) => {
      const val = minW + (range * i) / 4;
      return { val, y: scaleY(val) };
    });

    // X-axis labels
    const xLabels: Array<{ label: string; x: number }> = [];
    const step = Math.max(1, Math.floor(data.length / 5));
    for (let i = 0; i < data.length; i += step) {
      const d = new Date(data[i].date);
      xLabels.push({
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        x: scaleX(i),
      });
    }

    const goalY = goalW ? scaleY(goalW) : null;

    return { rawPath, estPathStr, rawPoints, estPoints, yTicks, xLabels, minW, maxW, range, goalY, goalW };
  }, [data, weightUnit, chartWidth, chartHeight, goalWeightKg]);

  if (!chartData || data.length < 2) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Need at least 2 measurements to show chart
        </Text>
      </View>
    );
  }

  const handleTouch = (evt: any) => {
    const touchX = evt.nativeEvent.locationX - PADDING.left;
    if (touchX < 0 || touchX > chartWidth) {
      setSelectedIndex(null);
      return;
    }

    // Find nearest data point
    let closest = 0;
    let closestDist = Infinity;
    chartData.rawPoints.forEach((p, i) => {
      const dist = Math.abs(p.x - touchX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    setSelectedIndex(closest);
  };

  const selected = selectedIndex != null ? data[selectedIndex] : null;
  const selectedRaw = selectedIndex != null ? chartData.rawPoints[selectedIndex] : null;

  return (
    <View style={styles.container}>
      {/* Tooltip */}
      {selected && selectedRaw && (
        <View style={[styles.tooltip, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.tooltipWeight, { color: colors.text }]}>
            {fromKg(selected.rawWeight, weightUnit).toFixed(1)} {weightUnit}
          </Text>
          {selected.estimatedWeight != null && (
            <Text style={[styles.tooltipEstimate, { color: '#E53E3E' }]}>
              Est: {fromKg(selected.estimatedWeight, weightUnit).toFixed(1)} {weightUnit}
            </Text>
          )}
          <Text style={[styles.tooltipDate, { color: colors.textSecondary }]}>
            {formatTimestamp(selected.date)}
          </Text>
        </View>
      )}

      <View
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
        onResponderRelease={() => setTimeout(() => setSelectedIndex(null), 2000)}>
        <Svg
          width={SCREEN_WIDTH - 64}
          height={height}
          viewBox={`0 0 ${SCREEN_WIDTH - 64} ${height}`}>
          {/* Y-axis unit label */}
          <SvgText
            x={PADDING.left - 8}
            y={PADDING.top - 10}
            fill={colors.textSecondary}
            fontSize={10}
            fontWeight="600"
            textAnchor="end">
            {weightUnit}
          </SvgText>

          {/* Grid lines */}
          {chartData.yTicks.map((tick, i) => (
            <Line
              key={`grid-${i}`}
              x1={PADDING.left}
              y1={tick.y + PADDING.top}
              x2={PADDING.left + chartWidth}
              y2={tick.y + PADDING.top}
              stroke={colors.surfaceBorder}
              strokeWidth={1}
            />
          ))}

          {/* Y-axis labels */}
          {chartData.yTicks.map((tick, i) => (
            <SvgText
              key={`ylabel-${i}`}
              x={PADDING.left - 8}
              y={tick.y + PADDING.top + 4}
              fill={colors.textSecondary}
              fontSize={10}
              textAnchor="end">
              {tick.val.toFixed(1)}
            </SvgText>
          ))}

          {/* X-axis labels */}
          {chartData.xLabels.map((label, i) => (
            <SvgText
              key={`xlabel-${i}`}
              x={label.x + PADDING.left}
              y={height - 6}
              fill={colors.textSecondary}
              fontSize={10}
              textAnchor="middle">
              {label.label}
            </SvgText>
          ))}

          {/* Goal weight line (green dashed) */}
          {chartData.goalY != null && chartData.goalW != null && (
            <>
              <Line
                x1={PADDING.left}
                y1={chartData.goalY + PADDING.top}
                x2={PADDING.left + chartWidth}
                y2={chartData.goalY + PADDING.top}
                stroke={colors.positive}
                strokeWidth={1.5}
                strokeDasharray="8,5"
              />
              <SvgText
                x={PADDING.left + chartWidth + 2}
                y={chartData.goalY + PADDING.top + 3}
                fill={colors.positive}
                fontSize={9}
                fontWeight="600"
                textAnchor="start">
                Goal
              </SvgText>
            </>
          )}

          {/* Raw weight line (solid, cerulean) */}
          <Path
            d={chartData.rawPath}
            fill="none"
            stroke={colors.tint}
            strokeWidth={2}
            translateX={PADDING.left}
            translateY={PADDING.top}
          />

          {/* Estimated weight line (red dotted) */}
          {chartData.estPathStr && (
            <Path
              d={chartData.estPathStr}
              fill="none"
              stroke="#E53E3E"
              strokeWidth={2}
              strokeDasharray="6,4"
              translateX={PADDING.left}
              translateY={PADDING.top}
            />
          )}

          {/* Raw weight dots */}
          {chartData.rawPoints.map((p, i) => (
            <Circle
              key={`dot-${i}`}
              cx={p.x + PADDING.left}
              cy={p.y + PADDING.top}
              r={selectedIndex === i ? 6 : 3}
              fill={selectedIndex === i ? '#E53E3E' : colors.tint}
            />
          ))}

          {/* Selection line */}
          {selectedRaw && (
            <Line
              x1={selectedRaw.x + PADDING.left}
              y1={PADDING.top}
              x2={selectedRaw.x + PADDING.left}
              y2={PADDING.top + chartHeight}
              stroke={colors.textSecondary}
              strokeWidth={1}
              strokeDasharray="4,3"
            />
          )}
        </Svg>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.tint }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Recorded</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLineDotted, { borderColor: '#E53E3E' }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Estimated</Text>
        </View>
        {goalWeightKg != null && (
          <View style={styles.legendItem}>
            <View style={[styles.legendLineDotted, { borderColor: colors.positive }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Goal</Text>
          </View>
        )}
      </View>

      {!selected && (
        <Text style={[styles.touchHint, { color: colors.textSecondary }]}>
          Tap on the chart to see details
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center' },
  tooltip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tooltipWeight: { fontSize: 16, fontWeight: '700' },
  tooltipEstimate: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  tooltipDate: { fontSize: 11, marginTop: 2 },
  legend: { flexDirection: 'row', gap: 20, marginTop: 8, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 16, height: 3, borderRadius: 1.5 },
  legendLineDotted: { width: 16, height: 0, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 1.5 },
  legendText: { fontSize: 12 },
  touchHint: { fontSize: 11, marginTop: 6, fontStyle: 'italic' },
});
