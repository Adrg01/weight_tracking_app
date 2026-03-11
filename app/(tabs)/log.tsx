// Log weight screen — main input for recording weight measurements

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/Colors';
import { toKg, fromKg, formatWeight } from '@/lib/units';

export default function LogScreen() {
  const { resolvedTheme, weightUnit, logWeight, bayesianResult, measurements } = useApp();
  const colors = Colors[resolvedTheme];

  const [weightInput, setWeightInput] = useState('');
  const [note, setNote] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [justLogged, setJustLogged] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleLog = async () => {
    const value = parseFloat(weightInput);
    if (isNaN(value) || value <= 0 || value > 500) {
      Alert.alert('Invalid weight', 'Please enter a valid weight.');
      return;
    }

    setIsLogging(true);
    try {
      const weightKg = toKg(value, weightUnit);
      await logWeight(weightKg, note || undefined);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setJustLogged(true);
      setWeightInput('');
      setNote('');

      setTimeout(() => setJustLogged(false), 3000);
    } catch (e) {
      Alert.alert('Error', 'Failed to log weight. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  const lastWeight = measurements.length > 0
    ? fromKg(measurements[0].weight_kg, weightUnit)
    : null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        {/* Success feedback */}
        {justLogged && (
          <View style={[styles.successBanner, { backgroundColor: colors.positive + '15' }]}>
            <Text style={[styles.successText, { color: colors.positive }]}>
              Weight logged successfully!
            </Text>
            {bayesianResult && (
              <Text style={[styles.successSubtext, { color: colors.positive }]}>
                Estimated true weight: {formatWeight(bayesianResult.estimatedTrueWeight, weightUnit)}
              </Text>
            )}
          </View>
        )}

        {/* Weight input */}
        <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Weight ({weightUnit})</Text>
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={[styles.weightInput, { color: colors.text }]}
              keyboardType="decimal-pad"
              placeholder={lastWeight ? lastWeight.toFixed(1) : weightUnit === 'kg' ? '70.0' : '154.0'}
              placeholderTextColor={colors.textSecondary + '60'}
              value={weightInput}
              onChangeText={setWeightInput}
              autoFocus
              selectTextOnFocus
            />
            <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>{weightUnit}</Text>
          </View>

          {lastWeight && (
            <TouchableOpacity
              style={[styles.quickFill, { borderColor: colors.surfaceBorder }]}
              onPress={() => setWeightInput(lastWeight.toFixed(1))}>
              <Text style={[styles.quickFillText, { color: colors.tint }]}>
                Last: {lastWeight.toFixed(1)} {weightUnit}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Optional note */}
        <View style={[styles.noteCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Note (optional)</Text>
          <TextInput
            style={[styles.noteInput, { color: colors.text }]}
            placeholder="e.g., after workout, morning fasted..."
            placeholderTextColor={colors.textSecondary + '60'}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={200}
          />
        </View>

        {/* Timestamp info */}
        <Text style={[styles.timestampInfo, { color: colors.textSecondary }]}>
          Recording at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} —
          Scaley will adjust for time-of-day variations.
        </Text>

        {/* Log button */}
        <TouchableOpacity
          style={[
            styles.logButton,
            { backgroundColor: colors.tint },
            isLogging && { opacity: 0.6 },
          ]}
          onPress={handleLog}
          disabled={isLogging || !weightInput}>
          <Text style={styles.logButtonText}>
            {isLogging ? 'Logging...' : 'Log Weight'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 16, justifyContent: 'center' },
  successBanner: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  successText: { fontSize: 16, fontWeight: '600' },
  successSubtext: { fontSize: 13, marginTop: 4 },
  inputCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    marginBottom: 12,
  },
  inputLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'baseline' },
  weightInput: {
    flex: 1,
    fontSize: 56,
    fontWeight: '700',
    padding: 0,
  },
  unitLabel: { fontSize: 24, marginLeft: 8 },
  quickFill: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  quickFillText: { fontSize: 13, fontWeight: '500' },
  noteCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  noteInput: {
    fontSize: 16,
    minHeight: 44,
    padding: 0,
  },
  timestampInfo: { fontSize: 12, textAlign: 'center', marginBottom: 24 },
  logButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
