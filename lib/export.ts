// CSV data export for Scaley

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getAllMeasurementsForExport, MeasurementRow } from '@/lib/database';
import { fromKg, WeightUnit } from '@/lib/units';

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatMeasurementsAsCSV(measurements: MeasurementRow[], weightUnit: WeightUnit): string {
  const headers = ['Date', 'Time', `Weight (${weightUnit})`, 'Weight (kg)', 'Note'];
  const rows = measurements.map(m => {
    const dt = new Date(m.measured_at);
    const date = dt.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const time = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const displayWeight = fromKg(m.weight_kg, weightUnit).toFixed(2);
    const kgWeight = m.weight_kg.toFixed(2);
    const note = m.note ? escapeCSV(m.note) : '';
    return [date, time, displayWeight, kgWeight, note].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export async function exportDataAsCSV(userId: string, weightUnit: WeightUnit): Promise<boolean> {
  try {
    const measurements = await getAllMeasurementsForExport(userId);

    if (measurements.length === 0) {
      return false;
    }

    const csv = formatMeasurementsAsCSV(measurements, weightUnit);
    const date = new Date().toISOString().split('T')[0];
    const filePath = `${FileSystem.cacheDirectory}scaley_export_${date}.csv`;

    await FileSystem.writeAsStringAsync(filePath, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Scaley Data',
        UTI: 'public.comma-separated-values-text',
      });
    }

    return true;
  } catch (e) {
    console.error('Export failed:', e);
    return false;
  }
}
