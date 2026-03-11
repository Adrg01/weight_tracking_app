// Transparent overlay modal for logging weight

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/Colors';
import { toKg, fromKg, formatWeight } from '@/lib/units';

interface LogWeightModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function LogWeightModal({ visible, onClose }: LogWeightModalProps) {
  const { resolvedTheme, weightUnit, logWeight, bayesianResult, measurements } = useApp();
  const colors = Colors[resolvedTheme];

  const [weightInput, setWeightInput] = useState('');
  const [note, setNote] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  const lastWeight = measurements.length > 0
    ? fromKg(measurements[0].weight_kg, weightUnit)
    : null;

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

      setTimeout(() => {
        setJustLogged(false);
        onClose();
      }, 1500);
    } catch (e) {
      Alert.alert('Error', 'Failed to log weight. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  const handleClose = () => {
    setWeightInput('');
    setNote('');
    setJustLogged(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.centerer}>
          <Pressable
            style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
            onPress={(e) => e.stopPropagation()}>
            {/* Success state */}
            {justLogged ? (
              <View style={styles.successContainer}>
                <Text style={[styles.successIcon, { color: colors.positive }]}>{'\u2713'}</Text>
                <Text style={[styles.successText, { color: colors.positive }]}>Logged!</Text>
                {bayesianResult && (
                  <Text style={[styles.successSub, { color: colors.textSecondary }]}>
                    Estimated: {formatWeight(bayesianResult.estimatedTrueWeight, weightUnit)}
                  </Text>
                )}
              </View>
            ) : (
              <>
                {/* Header */}
                <View style={styles.header}>
                  <Text style={[styles.title, { color: colors.text }]}>Log Weight</Text>
                  <TouchableOpacity onPress={handleClose}>
                    <Text style={[styles.closeButton, { color: colors.textSecondary }]}>{'\u2715'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Weight input */}
                <View style={styles.inputSection}>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={[styles.weightInput, { color: colors.text }]}
                      keyboardType="decimal-pad"
                      placeholder={lastWeight ? lastWeight.toFixed(1) : weightUnit === 'kg' ? '70.0' : '154.0'}
                      placeholderTextColor={colors.textSecondary + '50'}
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

                {/* Note */}
                <TextInput
                  style={[styles.noteInput, { color: colors.text, borderColor: colors.surfaceBorder }]}
                  placeholder="Add a note (optional)"
                  placeholderTextColor={colors.textSecondary + '60'}
                  value={note}
                  onChangeText={setNote}
                  maxLength={200}
                />

                {/* Timestamp */}
                <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — adjusted for time-of-day
                </Text>

                {/* Log button */}
                <TouchableOpacity
                  style={[
                    styles.logButton,
                    { backgroundColor: colors.tint },
                    (isLogging || !weightInput) && { opacity: 0.5 },
                  ]}
                  onPress={handleLog}
                  disabled={isLogging || !weightInput}>
                  <Text style={styles.logButtonText}>
                    {isLogging ? 'Logging...' : 'Log Weight'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modal: {
    width: '88%',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '700' },
  closeButton: { fontSize: 20, padding: 4 },
  inputSection: { marginBottom: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'baseline' },
  weightInput: {
    flex: 1,
    fontSize: 48,
    fontWeight: '700',
    padding: 0,
  },
  unitLabel: { fontSize: 22, marginLeft: 8 },
  quickFill: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  quickFillText: { fontSize: 13, fontWeight: '500' },
  noteInput: {
    fontSize: 15,
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginBottom: 12,
  },
  timestamp: { fontSize: 12, textAlign: 'center', marginBottom: 16 },
  logButton: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  successContainer: { alignItems: 'center', paddingVertical: 20 },
  successIcon: { fontSize: 48, marginBottom: 8 },
  successText: { fontSize: 22, fontWeight: '700' },
  successSub: { fontSize: 14, marginTop: 4 },
});
