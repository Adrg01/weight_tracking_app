// Analog clock time picker — drag the hand to set hours then minutes

import React, { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, PanResponder, TouchableOpacity } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

interface AnalogTimePickerProps {
  initialHours: number;
  initialMinutes: number;
  onConfirm: (hours: number, minutes: number) => void;
  onCancel: () => void;
  colors: any;
}

type PickerMode = 'hours' | 'minutes';

const CLOCK_SIZE = 260;
const CENTER = CLOCK_SIZE / 2;
const OUTER_RADIUS = 110;
const INNER_RADIUS = 75;
const HAND_LENGTH = 90;
const NUMBER_RADIUS = 95;

export default function AnalogTimePicker({
  initialHours,
  initialMinutes,
  onConfirm,
  onCancel,
  colors,
}: AnalogTimePickerProps) {
  const [hours, setHours] = useState(initialHours);
  const [minutes, setMinutes] = useState(initialMinutes);
  const [mode, setMode] = useState<PickerMode>('hours');
  const clockRef = useRef<View>(null);
  const layoutRef = useRef({ x: 0, y: 0 });

  const getAngleFromPosition = (px: number, py: number): number => {
    const dx = px - CENTER;
    const dy = py - CENTER;
    let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return angle;
  };

  const handleTouch = (x: number, y: number) => {
    const localX = x - layoutRef.current.x;
    const localY = y - layoutRef.current.y;
    const angle = getAngleFromPosition(localX, localY);

    if (mode === 'hours') {
      let h = Math.round(angle / 30) % 12;
      // Detect if touching inner ring (PM / 0,13-23) vs outer ring (AM / 1-12)
      const dx = localX - CENTER;
      const dy = localY - CENTER;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < INNER_RADIUS) {
        // Inner ring: 0, 13-23
        h = h === 0 ? 0 : h + 12;
      } else {
        // Outer ring: 1-12
        if (h === 0) h = 12;
      }
      setHours(h);
    } else {
      let m = Math.round(angle / 6) % 60;
      // Snap to nearest 5 if close
      const nearest5 = Math.round(m / 5) * 5;
      if (Math.abs(m - nearest5) <= 1) m = nearest5 % 60;
      setMinutes(m);
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          handleTouch(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
        },
        onPanResponderMove: (evt) => {
          handleTouch(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
        },
        onPanResponderRelease: () => {
          if (mode === 'hours') {
            setMode('minutes');
          }
        },
      }),
    [mode]
  );

  // Calculate hand endpoint
  const handAngle = mode === 'hours'
    ? ((hours % 12) / 12) * 360
    : (minutes / 60) * 360;
  const handAngleRad = (handAngle * Math.PI) / 180;
  const currentHandLength = mode === 'hours'
    ? (hours === 0 || hours > 12 ? INNER_RADIUS - 20 : HAND_LENGTH)
    : HAND_LENGTH;
  const handX = CENTER + currentHandLength * Math.sin(handAngleRad);
  const handY = CENTER - currentHandLength * Math.cos(handAngleRad);

  const onLayout = () => {
    clockRef.current?.measureInWindow((x, y) => {
      layoutRef.current = { x, y };
    });
  };

  const formatTime = (h: number, m: number) => {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Time display header */}
      <View style={styles.timeHeader}>
        <TouchableOpacity onPress={() => setMode('hours')}>
          <Text style={[
            styles.timeDigit,
            { color: mode === 'hours' ? colors.tint : colors.textSecondary },
          ]}>
            {hours.toString().padStart(2, '0')}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.timeColon, { color: colors.textSecondary }]}>:</Text>
        <TouchableOpacity onPress={() => setMode('minutes')}>
          <Text style={[
            styles.timeDigit,
            { color: mode === 'minutes' ? colors.tint : colors.textSecondary },
          ]}>
            {minutes.toString().padStart(2, '0')}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.modeHint, { color: colors.textSecondary }]}>
        {mode === 'hours' ? 'Select hour' : 'Select minutes'}
      </Text>

      {/* Clock face */}
      <View
        ref={clockRef}
        onLayout={onLayout}
        style={[styles.clockContainer, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        {...panResponder.panHandlers}>
        <Svg width={CLOCK_SIZE} height={CLOCK_SIZE}>
          {/* Clock background */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={OUTER_RADIUS + 12}
            fill={colors.surface}
          />

          {/* Selection indicator circle at hand endpoint */}
          <Circle
            cx={handX}
            cy={handY}
            r={18}
            fill={colors.tint}
          />

          {/* Clock hand */}
          <Line
            x1={CENTER}
            y1={CENTER}
            x2={handX}
            y2={handY}
            stroke={colors.tint}
            strokeWidth={2}
          />

          {/* Center dot */}
          <Circle cx={CENTER} cy={CENTER} r={4} fill={colors.tint} />

          {mode === 'hours' ? (
            <>
              {/* Outer ring: 1-12 */}
              {Array.from({ length: 12 }, (_, i) => {
                const num = i + 1;
                const angle = (num / 12) * 360 - 90;
                const rad = angle * (Math.PI / 180);
                const x = CENTER + NUMBER_RADIUS * Math.cos(rad);
                const y = CENTER + NUMBER_RADIUS * Math.sin(rad);
                const isSelected = hours === num;
                return (
                  <SvgText
                    key={`outer-${num}`}
                    x={x}
                    y={y + 5}
                    textAnchor="middle"
                    fontSize={15}
                    fontWeight={isSelected ? '700' : '400'}
                    fill={isSelected ? '#FFFFFF' : colors.text}
                  >
                    {num}
                  </SvgText>
                );
              })}
              {/* Inner ring: 0, 13-23 */}
              {Array.from({ length: 12 }, (_, i) => {
                const num = i === 0 ? 0 : i + 12;
                const displayNum = num;
                const angle = ((i === 0 ? 12 : i) / 12) * 360 - 90;
                const rad = angle * (Math.PI / 180);
                const innerNumRadius = 62;
                const x = CENTER + innerNumRadius * Math.cos(rad);
                const y = CENTER + innerNumRadius * Math.sin(rad);
                const isSelected = hours === num;
                return (
                  <SvgText
                    key={`inner-${num}`}
                    x={x}
                    y={y + 4}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={isSelected ? '700' : '400'}
                    fill={isSelected ? '#FFFFFF' : colors.textSecondary}
                  >
                    {displayNum}
                  </SvgText>
                );
              })}
            </>
          ) : (
            <>
              {/* Minutes: show 0, 5, 10, ... 55 */}
              {Array.from({ length: 12 }, (_, i) => {
                const num = i * 5;
                const angle = (num / 60) * 360 - 90;
                const rad = angle * (Math.PI / 180);
                const x = CENTER + NUMBER_RADIUS * Math.cos(rad);
                const y = CENTER + NUMBER_RADIUS * Math.sin(rad);
                const isSelected = minutes === num;
                return (
                  <SvgText
                    key={`min-${num}`}
                    x={x}
                    y={y + 5}
                    textAnchor="middle"
                    fontSize={15}
                    fontWeight={isSelected ? '700' : '400'}
                    fill={isSelected ? '#FFFFFF' : colors.text}
                  >
                    {num.toString().padStart(2, '0')}
                  </SvgText>
                );
              })}
              {/* Small tick marks for each minute */}
              {Array.from({ length: 60 }, (_, i) => {
                if (i % 5 === 0) return null;
                const angle = (i / 60) * 360 - 90;
                const rad = angle * (Math.PI / 180);
                const x = CENTER + (OUTER_RADIUS + 4) * Math.cos(rad);
                const y = CENTER + (OUTER_RADIUS + 4) * Math.sin(rad);
                return (
                  <Circle
                    key={`tick-${i}`}
                    cx={x}
                    cy={y}
                    r={1.5}
                    fill={colors.textSecondary + '60'}
                  />
                );
              })}
            </>
          )}
        </Svg>
      </View>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: colors.tint }]}
          onPress={() => onConfirm(hours, minutes)}>
          <Text style={styles.confirmText}>Set {formatTime(hours, minutes)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeDigit: {
    fontSize: 40,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  timeColon: {
    fontSize: 36,
    fontWeight: '300',
    marginHorizontal: 2,
  },
  modeHint: {
    fontSize: 13,
    marginBottom: 4,
  },
  clockContainer: {
    width: CLOCK_SIZE,
    height: CLOCK_SIZE,
    borderRadius: CLOCK_SIZE / 2,
    borderWidth: 1,
    overflow: 'hidden',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
  confirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
