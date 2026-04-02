// Simple calendar picker overlay for date selection

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';

interface CalendarPickerProps {
  selectedDate: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  colors: any;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarPicker({ selectedDate, onConfirm, onCancel, colors }: CalendarPickerProps) {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const [chosen, setChosen] = useState(selectedDate);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    return d > today;
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={styles.container}>
      {/* Month/Year header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Text style={[styles.navText, { color: colors.tint }]}>{'\u2039'}</Text>
        </TouchableOpacity>
        <Text style={[styles.monthYear, { color: colors.text }]}>
          {MONTHS[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Text style={[styles.navText, { color: colors.tint }]}>{'\u203A'}</Text>
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={styles.row}>
        {DAYS.map(d => (
          <View key={d} style={styles.cell}>
            <Text style={[styles.dayHeader, { color: colors.textSecondary }]}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {Array.from({ length: cells.length / 7 }, (_, week) => (
        <View key={week} style={styles.row}>
          {cells.slice(week * 7, week * 7 + 7).map((day, idx) => {
            if (day === null) {
              return <View key={`e-${idx}`} style={styles.cell} />;
            }
            const dateObj = new Date(viewYear, viewMonth, day);
            const selected = isSameDay(dateObj, chosen);
            const isToday = isSameDay(dateObj, today);
            const disabled = isDisabled(day);

            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.cell,
                  styles.dayCell,
                  selected && { backgroundColor: colors.tint },
                  isToday && !selected && { borderWidth: 1, borderColor: colors.tint },
                ]}
                disabled={disabled}
                onPress={() => setChosen(dateObj)}>
                <Text
                  style={[
                    styles.dayText,
                    { color: colors.text },
                    selected && { color: '#FFFFFF', fontWeight: '700' },
                    disabled && { color: colors.textSecondary + '40' },
                  ]}>
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: colors.tint }]}
          onPress={() => onConfirm(chosen)}>
          <Text style={styles.confirmText}>
            {chosen.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 28,
    fontWeight: '300',
  },
  monthYear: {
    fontSize: 17,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  dayHeader: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayCell: {
    borderRadius: 20,
    height: 36,
    marginVertical: 1,
  },
  dayText: {
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
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
