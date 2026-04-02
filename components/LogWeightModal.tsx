// Transparent overlay modal for logging or editing weight

import React, { useState, useEffect, useRef } from 'react';
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
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/Colors';
import { toKg, fromKg, formatWeight } from '@/lib/units';
import { showPeriodicInterstitial } from '@/lib/ads';
import AnalogTimePicker from '@/components/AnalogTimePicker';
import CalendarPicker from '@/components/CalendarPicker';

export interface EditData {
  id: string;
  weightKg: number;
  measuredAt: string; // ISO string
  note: string | null;
}

interface LogWeightModalProps {
  visible: boolean;
  onClose: () => void;
  editData?: EditData | null;
}

export default function LogWeightModal({ visible, onClose, editData }: LogWeightModalProps) {
  const { resolvedTheme, weightUnit, logWeight, editWeight, bayesianResult, measurements } = useApp();
  const colors = Colors[resolvedTheme];

  const isEditMode = !!editData;

  const [weightInput, setWeightInput] = useState('');
  const [note, setNote] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedHours, setSelectedHours] = useState(new Date().getHours());
  const [selectedMinutes, setSelectedMinutes] = useState(new Date().getMinutes());
  const [isLogging, setIsLogging] = useState(false);
  const [justLogged, setJustLogged] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const weightInputRef = useRef<TextInput>(null);

  // Initialize fields when modal opens or editData changes
  useEffect(() => {
    if (visible) {
      if (editData) {
        const editDate = new Date(editData.measuredAt);
        setWeightInput(fromKg(editData.weightKg, weightUnit).toFixed(1));
        setNote(editData.note ?? '');
        setSelectedDate(editDate);
        setSelectedHours(editDate.getHours());
        setSelectedMinutes(editDate.getMinutes());
      } else {
        const now = new Date();
        setWeightInput('');
        setNote('');
        setSelectedDate(now);
        setSelectedHours(now.getHours());
        setSelectedMinutes(now.getMinutes());
      }
      setJustLogged(false);
      setShowCalendar(false);
      setShowTimePicker(false);
      // Focus weight input after modal animation completes
      setTimeout(() => weightInputRef.current?.focus(), 400);
    }
  }, [visible, editData]);

  const lastWeight = measurements.length > 0
    ? fromKg(measurements[0].weight_kg, weightUnit)
    : null;

  const buildTimestamp = (): string => {
    const d = new Date(selectedDate);
    d.setHours(selectedHours, selectedMinutes, 0, 0);
    return d.toISOString();
  };

  const handleLog = async () => {
    const value = parseFloat(weightInput);
    if (isNaN(value) || value <= 0 || value > 500) {
      Alert.alert('Invalid weight', 'Please enter a valid weight.');
      return;
    }

    setIsLogging(true);
    try {
      const weightKg = toKg(value, weightUnit);
      const timestamp = buildTimestamp();

      if (isEditMode && editData) {
        await editWeight(editData.id, weightKg, timestamp, note || undefined);
      } else {
        await logWeight(weightKg, note || undefined, timestamp);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setJustLogged(true);

      // Show interstitial ad on new logs only (max 1/day)
      if (!isEditMode) {
        showPeriodicInterstitial().catch(() => {});
      }

      setTimeout(() => {
        setJustLogged(false);
        onClose();
      }, 1500);
    } catch (e) {
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'log'} weight. Please try again.`);
    } finally {
      setIsLogging(false);
    }
  };

  const handleClose = () => {
    setWeightInput('');
    setNote('');
    setJustLogged(false);
    setShowCalendar(false);
    setShowTimePicker(false);
    onClose();
  };

  const formatDateDisplay = () => {
    return selectedDate.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTimeDisplay = () => {
    return `${selectedHours.toString().padStart(2, '0')}:${selectedMinutes.toString().padStart(2, '0')}`;
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
                <Text style={[styles.successText, { color: colors.positive }]}>
                  {isEditMode ? 'Updated!' : 'Logged!'}
                </Text>
                {bayesianResult && !isEditMode && (
                  <Text style={[styles.successSub, { color: colors.textSecondary }]}>
                    Estimated: {formatWeight(bayesianResult.estimatedTrueWeight, weightUnit)}
                  </Text>
                )}
              </View>
            ) : showCalendar ? (
              /* Calendar picker overlay */
              <ScrollView showsVerticalScrollIndicator={false}>
                <CalendarPicker
                  selectedDate={selectedDate}
                  onConfirm={(date) => {
                    setSelectedDate(date);
                    setShowCalendar(false);
                  }}
                  onCancel={() => setShowCalendar(false)}
                  colors={colors}
                />
              </ScrollView>
            ) : showTimePicker ? (
              /* Analog time picker overlay */
              <ScrollView showsVerticalScrollIndicator={false}>
                <AnalogTimePicker
                  initialHours={selectedHours}
                  initialMinutes={selectedMinutes}
                  onConfirm={(h, m) => {
                    setSelectedHours(h);
                    setSelectedMinutes(m);
                    setShowTimePicker(false);
                  }}
                  onCancel={() => setShowTimePicker(false)}
                  colors={colors}
                />
              </ScrollView>
            ) : (
              <>
                {/* Header */}
                <View style={styles.header}>
                  <Text style={[styles.title, { color: colors.text }]}>
                    {isEditMode ? 'Edit Weight' : 'Log Weight'}
                  </Text>
                  <TouchableOpacity onPress={handleClose}>
                    <Text style={[styles.closeButton, { color: colors.textSecondary }]}>{'\u2715'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Weight input */}
                <View style={styles.inputSection}>
                  <View style={styles.inputRow}>
                    <TextInput
                      ref={weightInputRef}
                      style={[styles.weightInput, { color: colors.text }]}
                      keyboardType="decimal-pad"
                      placeholder={lastWeight ? lastWeight.toFixed(1) : weightUnit === 'kg' ? '70.0' : '154.0'}
                      placeholderTextColor={colors.textSecondary + '50'}
                      value={weightInput}
                      onChangeText={setWeightInput}
                      selectTextOnFocus
                    />
                    <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>{weightUnit}</Text>
                  </View>

                  {lastWeight && !isEditMode && (
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

                {/* Date & Time selectors */}
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity
                    style={[styles.dateTimeBtn, { borderColor: colors.surfaceBorder }]}
                    onPress={() => setShowCalendar(true)}>
                    <Text style={[styles.dateTimeIcon, { color: colors.tint }]}>{'\uD83D\uDCC5'}</Text>
                    <Text style={[styles.dateTimeText, { color: colors.text }]}>{formatDateDisplay()}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.dateTimeBtn, { borderColor: colors.surfaceBorder }]}
                    onPress={() => setShowTimePicker(true)}>
                    <Text style={[styles.dateTimeIcon, { color: colors.tint }]}>{'\uD83D\uDD52'}</Text>
                    <Text style={[styles.dateTimeText, { color: colors.text }]}>{formatTimeDisplay()}</Text>
                  </TouchableOpacity>
                </View>

                {/* Log/Save button */}
                <TouchableOpacity
                  style={[
                    styles.logButton,
                    { backgroundColor: colors.tint },
                    (isLogging || !weightInput) && { opacity: 0.5 },
                  ]}
                  onPress={handleLog}
                  disabled={isLogging || !weightInput}>
                  <Text style={styles.logButtonText}>
                    {isLogging
                      ? (isEditMode ? 'Saving...' : 'Logging...')
                      : (isEditMode ? 'Save Changes' : 'Log Weight')
                    }
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
    maxHeight: '85%',
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
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  dateTimeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  dateTimeIcon: {
    fontSize: 16,
  },
  dateTimeText: {
    fontSize: 14,
    fontWeight: '500',
  },
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
