// Settings screen — profile, units, theme, reminders

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/Colors';
import { formatHeight, formatWeight, cmToFtIn, ftInToCm, fromKg, WeightUnit, HeightUnit } from '@/lib/units';
import SwipeableTab from '@/components/SwipeableTab';
import AnalogTimePicker from '@/components/AnalogTimePicker';
import { exportDataAsCSV } from '@/lib/export';
import * as WebBrowser from 'expo-web-browser';

export default function SettingsScreen() {
  const {
    resolvedTheme,
    themePreference,
    setThemePreference,
    user,
    saveUser,
    weightUnit,
    heightUnit,
    setWeightUnit,
    setHeightUnit,
    clearHistory,
    measurements,
  } = useApp();
  const colors = Colors[resolvedTheme];

  const [editingField, setEditingField] = useState<string | null>(null);

  // Edit state for each field type
  const [editAge, setEditAge] = useState('');
  const [editHeightCm, setEditHeightCm] = useState('');
  const [editHeightFt, setEditHeightFt] = useState('');
  const [editHeightIn, setEditHeightIn] = useState('');
  const [editGoalWeight, setEditGoalWeight] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Focus the input after modal animation completes
  const focusInput = useCallback((node: TextInput | null) => {
    if (node) {
      setTimeout(() => node.focus(), 100);
    }
  }, []);

  // Open edit overlay for a field
  const openEdit = (field: string) => {
    switch (field) {
      case 'age':
        setEditAge(user?.age?.toString() ?? '');
        break;
      case 'height_cm':
        if (heightUnit === 'cm') {
          setEditHeightCm(user?.height_cm ? Math.round(user.height_cm).toString() : '');
        } else {
          if (user?.height_cm) {
            const { feet, inches } = cmToFtIn(user.height_cm);
            setEditHeightFt(feet.toString());
            setEditHeightIn(inches.toString());
          } else {
            setEditHeightFt('');
            setEditHeightIn('');
          }
        }
        break;
      case 'goal_weight_kg':
        if (user?.goal_weight_kg) {
          const val = weightUnit === 'kg' ? user.goal_weight_kg : fromKg(user.goal_weight_kg, weightUnit);
          setEditGoalWeight(Math.round(val * 10) / 10 + '');
        } else {
          setEditGoalWeight('');
        }
        break;
      case 'wake_time':
      case 'sleep_time':
        break;
    }
    setEditingField(field);
  };

  const saveField = async (field: string) => {
    switch (field) {
      case 'age':
        await saveUser({ age: parseInt(editAge) || null } as any);
        break;
      case 'height_cm':
        if (heightUnit === 'cm') {
          await saveUser({ height_cm: parseFloat(editHeightCm) || null } as any);
        } else {
          const cm = ftInToCm(parseInt(editHeightFt) || 0, parseInt(editHeightIn) || 0);
          await saveUser({ height_cm: cm > 0 ? cm : null } as any);
        }
        break;
      case 'goal_weight_kg': {
        const val = parseFloat(editGoalWeight);
        if (!val) {
          await saveUser({ goal_weight_kg: null } as any);
        } else {
          const kg = weightUnit === 'kg' ? val : val / 2.20462;
          await saveUser({ goal_weight_kg: kg } as any);
        }
        break;
      }
    }
    setEditingField(null);
  };

  const selectGender = async (g: string) => {
    await saveUser({ gender: g } as any);
    setEditingField(null);
  };

  // Display values
  const heightDisplay = user?.height_cm ? formatHeight(user.height_cm, heightUnit) : 'Not set';
  const goalDisplay = user?.goal_weight_kg ? formatWeight(user.goal_weight_kg, weightUnit) : 'Not set';

  // Render a simple display row (tap to edit)
  const renderDisplayRow = (label: string, value: string, field: string) => {
    const isNotSet = value === 'Not set';
    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: colors.surfaceBorder }]}
        onPress={() => openEdit(field)}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: isNotSet ? colors.textSecondary + '80' : colors.textSecondary }]}>
          {value}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderToggleRow = (
    label: string,
    options: Array<{ label: string; value: string }>,
    currentValue: string,
    onSelect: (value: string) => void
  ) => (
    <View style={[styles.row, { borderBottomColor: colors.surfaceBorder }]}>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.toggleRow}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.toggleButton,
              { borderColor: colors.surfaceBorder },
              currentValue === opt.value && { backgroundColor: colors.tint, borderColor: colors.tint },
            ]}
            onPress={() => onSelect(opt.value)}>
            <Text
              style={[
                styles.toggleButtonText,
                { color: colors.text },
                currentValue === opt.value && { color: '#fff' },
              ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Unit toggle pill (inline, small)
  const renderUnitPill = (
    options: Array<{ label: string; value: string }>,
    currentValue: string,
    onSelect: (value: string) => void
  ) => (
    <View style={styles.unitPillRow}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.unitPill,
            { borderColor: colors.surfaceBorder },
            currentValue === opt.value && { backgroundColor: colors.tint, borderColor: colors.tint },
          ]}
          onPress={() => onSelect(opt.value)}>
          <Text
            style={[
              styles.unitPillText,
              { color: colors.text },
              currentValue === opt.value && { color: '#fff' },
            ]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Edit overlay modal
  const renderEditOverlay = () => {
    if (!editingField) return null;

    let title = '';
    let content: React.ReactNode = null;

    switch (editingField) {
      case 'gender':
        title = 'Gender';
        content = (
          <View style={styles.genderOptions}>
            {['Male', 'Female', 'Other'].map(g => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.genderButton,
                  { borderColor: colors.surfaceBorder, backgroundColor: colors.surface },
                  user?.gender === g.toLowerCase() && { backgroundColor: colors.tint, borderColor: colors.tint },
                ]}
                onPress={() => selectGender(g.toLowerCase())}>
                <Text
                  style={[
                    styles.genderButtonText,
                    { color: colors.text },
                    user?.gender === g.toLowerCase() && { color: '#fff' },
                  ]}>
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );
        break;

      case 'age':
        title = 'Age';
        content = (
          <View style={styles.editContent}>
            <TextInput
              style={[styles.overlayInput, { color: colors.text, borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}
              value={editAge}
              onChangeText={setEditAge}
              keyboardType="number-pad"
              placeholder="e.g. 25"
              placeholderTextColor={colors.textSecondary}
              ref={focusInput}
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.tint }]}
              onPress={() => saveField('age')}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        );
        break;

      case 'height_cm':
        title = 'Height';
        content = (
          <View style={styles.editContent}>
            {renderUnitPill(
              [{ label: 'cm', value: 'cm' }, { label: 'ft / in', value: 'ft_in' }],
              heightUnit,
              (v) => {
                setHeightUnit(v as HeightUnit);
                // Convert values when switching
                if (v === 'ft_in' && editHeightCm) {
                  const cm = parseFloat(editHeightCm);
                  if (cm) {
                    const { feet, inches } = cmToFtIn(cm);
                    setEditHeightFt(feet.toString());
                    setEditHeightIn(inches.toString());
                  }
                } else if (v === 'cm' && (editHeightFt || editHeightIn)) {
                  const cm = ftInToCm(parseInt(editHeightFt) || 0, parseInt(editHeightIn) || 0);
                  if (cm > 0) setEditHeightCm(Math.round(cm).toString());
                }
              }
            )}
            {heightUnit === 'cm' ? (
              <TextInput
                style={[styles.overlayInput, { color: colors.text, borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}
                value={editHeightCm}
                onChangeText={setEditHeightCm}
                keyboardType="number-pad"
                placeholder="e.g. 165"
                placeholderTextColor={colors.textSecondary}
                ref={focusInput}
              />
            ) : (
              <View style={styles.ftInRow}>
                <View style={styles.ftInField}>
                  <TextInput
                    style={[styles.overlayInput, { color: colors.text, borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}
                    value={editHeightFt}
                    onChangeText={setEditHeightFt}
                    keyboardType="number-pad"
                    placeholder="5"
                    placeholderTextColor={colors.textSecondary}
                    ref={focusInput}
                  />
                  <Text style={[styles.ftInLabel, { color: colors.textSecondary }]}>ft</Text>
                </View>
                <View style={styles.ftInField}>
                  <TextInput
                    style={[styles.overlayInput, { color: colors.text, borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}
                    value={editHeightIn}
                    onChangeText={setEditHeightIn}
                    keyboardType="number-pad"
                    placeholder="5"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={[styles.ftInLabel, { color: colors.textSecondary }]}>in</Text>
                </View>
              </View>
            )}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.tint }]}
              onPress={() => saveField('height_cm')}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        );
        break;

      case 'goal_weight_kg':
        title = 'Goal Weight';
        content = (
          <View style={styles.editContent}>
            {renderUnitPill(
              [{ label: 'kg', value: 'kg' }, { label: 'lbs', value: 'lbs' }],
              weightUnit,
              (v) => {
                const newUnit = v as WeightUnit;
                // Convert the current edit value
                if (editGoalWeight) {
                  const val = parseFloat(editGoalWeight);
                  if (val) {
                    if (newUnit === 'lbs' && weightUnit === 'kg') {
                      setEditGoalWeight((val * 2.20462).toFixed(1));
                    } else if (newUnit === 'kg' && weightUnit === 'lbs') {
                      setEditGoalWeight((val / 2.20462).toFixed(1));
                    }
                  }
                }
                setWeightUnit(newUnit);
              }
            )}
            <TextInput
              style={[styles.overlayInput, { color: colors.text, borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}
              value={editGoalWeight}
              onChangeText={setEditGoalWeight}
              keyboardType="decimal-pad"
              placeholder={weightUnit === 'kg' ? 'e.g. 58' : 'e.g. 128'}
              placeholderTextColor={colors.textSecondary}
              ref={focusInput}
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.tint }]}
              onPress={() => saveField('goal_weight_kg')}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        );
        break;

      case 'wake_time': {
        title = 'Wake Time';
        const [wH, wM] = (user?.wake_time ?? '07:00').split(':').map(Number);
        content = (
          <AnalogTimePicker
            initialHours={wH}
            initialMinutes={wM}
            colors={colors}
            onCancel={() => setEditingField(null)}
            onConfirm={(h, m) => {
              const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
              saveUser({ wake_time: timeStr } as any);
              setEditingField(null);
            }}
          />
        );
        break;
      }

      case 'sleep_time': {
        title = 'Sleep Time';
        const [sH, sM] = (user?.sleep_time ?? '23:00').split(':').map(Number);
        content = (
          <AnalogTimePicker
            initialHours={sH}
            initialMinutes={sM}
            colors={colors}
            onCancel={() => setEditingField(null)}
            onConfirm={(h, m) => {
              const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
              saveUser({ sleep_time: timeStr } as any);
              setEditingField(null);
            }}
          />
        );
        break;
      }
    }

    return (
      <Modal
        visible={true}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingField(null)}>
        <TouchableOpacity
          style={styles.overlayBackdrop}
          activeOpacity={1}
          onPress={() => setEditingField(null)}>
          <View
            style={[styles.overlayCard, { backgroundColor: colors.background, borderColor: colors.surfaceBorder }]}
            onStartShouldSetResponder={() => true}>
            <Text style={[styles.overlayTitle, { color: colors.text }]}>{title}</Text>
            {content}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <SwipeableTab currentIndex={3}>
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      {/* Profile section */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile</Text>
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        {renderDisplayRow('Gender', user?.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : 'Not set', 'gender')}
        {renderDisplayRow('Age', user?.age?.toString() ?? 'Not set', 'age')}
        {renderDisplayRow('Height', heightDisplay, 'height_cm')}
        {renderDisplayRow('Goal Weight', goalDisplay, 'goal_weight_kg')}
      </View>

      {/* Theme section */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        {renderToggleRow(
          'Theme',
          [
            { label: 'System', value: 'system' },
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ],
          themePreference,
          (v) => setThemePreference(v as any)
        )}
      </View>

      {/* Reminders section */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Reminders</Text>
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        {renderDisplayRow('Wake Time', user?.wake_time ?? '07:00', 'wake_time')}
        {renderDisplayRow('Sleep Time', user?.sleep_time ?? '23:00', 'sleep_time')}
      </View>

      {/* Data section */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Data</Text>
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <TouchableOpacity
          style={[styles.row, { borderBottomColor: colors.surfaceBorder }]}
          onPress={async () => {
            if (!user || measurements.length === 0) {
              Alert.alert('No Data', 'There are no measurements to export.');
              return;
            }
            await exportDataAsCSV(user.id, weightUnit);
          }}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Export Data</Text>
          <Text style={[styles.rowValue, { color: colors.textSecondary }]}>CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.row, { borderBottomColor: colors.surfaceBorder }]}
          onPress={() => {
            if (measurements.length === 0) {
              Alert.alert('No Data', 'There are no measurements to clear.');
              return;
            }
            Alert.alert(
              'Clear History',
              `Are you sure you want to clear all ${measurements.length} measurement${measurements.length === 1 ? '' : 's'}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear All',
                  style: 'destructive',
                  onPress: () => clearHistory(),
                },
              ]
            );
          }}>
          <Text style={[styles.rowLabel, { color: colors.negative }]}>Clear History</Text>
          <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
            {measurements.length} measurement{measurements.length === 1 ? '' : 's'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* App info */}
      <View style={styles.appInfo}>
        <Text style={[styles.appName, { color: colors.tint }]}>Scaley</Text>
        <Text style={[styles.appVersion, { color: colors.textSecondary }]}>Version 1.0.0</Text>
        <TouchableOpacity
          style={{ marginTop: 12 }}
          onPress={() => WebBrowser.openBrowserAsync('https://adrg01.github.io/weight_tracking_app/privacy-policy.html')}>
          <Text style={[styles.rowValue, { color: colors.tint }]}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>

    {renderEditOverlay()}
    </SwipeableTab>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 24,
    marginLeft: 4,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    minHeight: 52,
  },
  rowLabel: { fontSize: 15, fontWeight: '500', flex: 1 },
  rowValue: { fontSize: 15 },
  toggleRow: { flexDirection: 'row', gap: 6 },
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 16,
  },
  toggleButtonText: { fontSize: 13, fontWeight: '500' },
  // Edit overlay
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  overlayTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  editContent: {
    gap: 16,
  },
  overlayInput: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
  },
  saveBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  // Gender picker
  genderOptions: {
    gap: 10,
  },
  genderButton: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderButtonText: { fontSize: 17, fontWeight: '500' },
  // Unit pills (inline in overlay)
  unitPillRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  unitPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 20,
  },
  unitPillText: { fontSize: 14, fontWeight: '600' },
  // ft/in
  ftInRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ftInField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ftInLabel: { fontSize: 16, fontWeight: '500' },
  // App info
  appInfo: { alignItems: 'center', marginTop: 40 },
  appName: { fontSize: 20, fontWeight: '700' },
  appVersion: { fontSize: 13, marginTop: 4 },
});
