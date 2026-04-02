// CSV data export for Scaley

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getAllMeasurementsForExport, MeasurementRow, User } from '@/lib/database';
import { fromKg, formatHeight, WeightUnit, HeightUnit } from '@/lib/units';

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

interface ExportProfile {
  height_cm: number | null;
  age: number | null;
  gender: string | null;
  goal_weight_kg: number | null;
  weight_unit: string;
  height_unit: string;
}

function formatMeasurementsAsCSV(
  measurements: MeasurementRow[],
  weightUnit: WeightUnit,
  profile?: ExportProfile
): string {
  const lines: string[] = [];

  // Profile metadata header
  if (profile) {
    const heightUnit = (profile.height_unit || 'cm') as HeightUnit;
    lines.push(`# Scaley Export`);
    lines.push(`# Exported,${new Date().toISOString().split('T')[0]}`);
    if (profile.height_cm != null) lines.push(`# Height,${formatHeight(profile.height_cm, heightUnit)}`);
    if (profile.age != null) lines.push(`# Age,${profile.age}`);
    if (profile.gender) lines.push(`# Gender,${profile.gender}`);
    if (profile.goal_weight_kg != null) lines.push(`# Goal Weight,${fromKg(profile.goal_weight_kg, weightUnit).toFixed(1)} ${weightUnit}`);
    lines.push(`#`);
  }

  const headers = ['Date', 'Time', `Weight (${weightUnit})`, 'Weight (kg)', 'Note'];
  lines.push(headers.join(','));

  for (const m of measurements) {
    const dt = new Date(m.measured_at);
    const date = dt.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const time = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const displayWeight = fromKg(m.weight_kg, weightUnit).toFixed(2);
    const kgWeight = m.weight_kg.toFixed(2);
    const note = m.note ? escapeCSV(m.note) : '';
    lines.push([date, time, displayWeight, kgWeight, note].join(','));
  }

  return lines.join('\n');
}

export async function exportDataAsCSV(userId: string, weightUnit: WeightUnit, user?: User | null): Promise<boolean> {
  try {
    const measurements = await getAllMeasurementsForExport(userId);

    if (measurements.length === 0) {
      return false;
    }

    const profile: ExportProfile | undefined = user ? {
      height_cm: user.height_cm,
      age: user.age,
      gender: user.gender,
      goal_weight_kg: user.goal_weight_kg,
      weight_unit: user.weight_unit,
      height_unit: user.height_unit,
    } : undefined;

    const csv = formatMeasurementsAsCSV(measurements, weightUnit, profile);
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

// ---------------------------------------------------------------------------
// CSV Import
// ---------------------------------------------------------------------------

const LBS_TO_KG = 1 / 2.20462;

/**
 * Parse a single CSV line, respecting quoted values that may contain commas.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        // Peek ahead: doubled quote is an escaped quote
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Find the index in `headers` that matches one of the `candidates` (case-insensitive).
 * Returns -1 if no match is found.
 */
function findColumn(headers: string[], candidates: string[]): number {
  const lower = headers.map(h => h.toLowerCase().trim());
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Try to parse a weight string into a number. Returns NaN on failure.
 */
function parseWeight(raw: string): number {
  const cleaned = raw.replace(/[^\d.\-]/g, '');
  return parseFloat(cleaned);
}

/**
 * Determine whether the weight column is in lbs based on column name or a
 * dedicated unit column value.
 */
function isLbs(columnName: string, unitValue?: string): boolean {
  if (unitValue) {
    const u = unitValue.toLowerCase().trim();
    if (u === 'lbs' || u === 'lb' || u === 'pounds') return true;
    if (u === 'kg' || u === 'kilograms') return false;
  }
  const col = columnName.toLowerCase();
  if (col.includes('lbs') || col.includes('lb') || col.includes('pound')) return true;
  return false;
}

/**
 * Attempt to build an ISO timestamp from the available columns in a row.
 *
 * Handles:
 *  - A single ISO 8601 string (e.g. "2026-03-11T17:42:52.176Z")
 *  - A date string like "2026-03-11" optionally combined with a separate time column
 *  - Various common date formats
 */
function buildTimestamp(dateStr: string, timeStr?: string): string | null {
  if (!dateStr) return null;

  // If the date string already looks like a full ISO timestamp, use it directly.
  if (/\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Try combining date + time
  let combined = dateStr;
  if (timeStr) {
    combined = `${dateStr} ${timeStr}`;
  }

  // Attempt native Date parsing (handles "YYYY-MM-DD", "YYYY-MM-DD HH:mm", etc.)
  let d = new Date(combined);
  if (!isNaN(d.getTime())) return d.toISOString();

  // Try MM/DD/YYYY or DD/MM/YYYY (assume MM/DD/YYYY first)
  const slashMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    const [, a, b, year] = slashMatch;
    // Try MM/DD/YYYY
    const attempt = new Date(`${year}-${a.padStart(2, '0')}-${b.padStart(2, '0')}${timeStr ? 'T' + timeStr : ''}`);
    if (!isNaN(attempt.getTime())) return attempt.toISOString();
  }

  return null;
}

export async function importDataFromCSV(): Promise<{
  measurements: Array<{ weight_kg: number; measured_at: string; note?: string }>;
  count: number;
  skipped: number;
} | null> {
  // 1. Let user pick a file
  const result = await DocumentPicker.getDocumentAsync({ type: 'text/*' });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets?.[0];
  if (!asset?.uri) {
    return null;
  }

  // 2. Read file content
  let content: string;
  try {
    // Try reading directly first
    content = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch (e1) {
    // Android content:// URIs can't be read directly — copy to cache first
    try {
      const cacheUri = `${FileSystem.cacheDirectory}import_temp.csv`;
      await FileSystem.copyAsync({ from: asset.uri, to: cacheUri });
      content = await FileSystem.readAsStringAsync(cacheUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch (e2) {
      console.error('Import read error (direct):', e1);
      console.error('Import read error (copy):', e2);
      console.error('Asset URI:', asset.uri);
      throw new Error('Could not read the selected file. Please try again with a valid CSV file.');
    }
  }

  // 3. Split into lines, remove empty lines and # comment lines (profile metadata)
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0 && !l.trim().startsWith('#'));

  if (lines.length < 2) {
    throw new Error('The CSV file appears to be empty or has no data rows.');
  }

  // 4. Parse headers
  const headers = parseCSVLine(lines[0]);

  // Locate relevant columns
  const dateCol = findColumn(headers, [
    'date', 'weight date', 'timestamp', 'measured_at', 'datetime', 'date/time',
  ]);
  const timeCol = findColumn(headers, ['time']);
  const weightCol = findColumn(headers, [
    'weight (kg)', 'weight (lbs)', 'weight measurement', 'weight_kg', 'weight', 'mass',
  ]);
  const unitCol = findColumn(headers, ['weight unit', 'unit']);
  const noteCol = findColumn(headers, ['note', 'notes', 'comment', 'comments', 'memo']);

  if (dateCol === -1) {
    throw new Error(
      'Could not find a date column in the CSV. Expected a column named "Date", "Weight Date", "Timestamp", or similar.',
    );
  }
  if (weightCol === -1) {
    throw new Error(
      'Could not find a weight column in the CSV. Expected a column named "Weight", "Weight (kg)", "Weight Measurement", or similar.',
    );
  }

  const weightHeader = headers[weightCol];

  // 5. Parse data rows
  const measurements: Array<{ weight_kg: number; measured_at: string; note?: string }> = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    try {
      const fields = parseCSVLine(lines[i]);

      // Weight
      const rawWeight = fields[weightCol] ?? '';
      let weight = parseWeight(rawWeight);
      if (isNaN(weight) || weight <= 0) {
        skipped++;
        continue;
      }

      // Unit detection & conversion
      const unitValue = unitCol !== -1 ? fields[unitCol] : undefined;
      if (isLbs(weightHeader, unitValue)) {
        weight = weight * LBS_TO_KG;
      }

      // Round to 2 decimal places
      weight = Math.round(weight * 100) / 100;

      // Timestamp
      const dateValue = fields[dateCol] ?? '';
      const timeValue = timeCol !== -1 ? fields[timeCol] : undefined;
      const timestamp = buildTimestamp(dateValue, timeValue);

      if (!timestamp) {
        skipped++;
        continue;
      }

      // Note (optional)
      const noteValue = noteCol !== -1 ? (fields[noteCol] ?? '').trim() : undefined;
      const entry: { weight_kg: number; measured_at: string; note?: string } = {
        weight_kg: weight,
        measured_at: timestamp,
      };
      if (noteValue) {
        entry.note = noteValue;
      }

      measurements.push(entry);
    } catch {
      skipped++;
    }
  }

  if (measurements.length === 0) {
    throw new Error(
      `Could not parse any valid measurements from the CSV (${skipped} rows skipped). Please check that the file format is correct.`,
    );
  }

  return {
    measurements,
    count: measurements.length,
    skipped,
  };
}
