// SQLite database layer for Scaley
// Schema designed for future cloud sync (UUIDs, timestamps, synced_at)

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'scaley.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync('PRAGMA journal_mode = WAL;');
  }
  return db;
}

export async function resetDatabase(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(`
    DROP TABLE IF EXISTS tip_history;
    DROP TABLE IF EXISTS bayesian_state;
    DROP TABLE IF EXISTS daily_estimates;
    DROP TABLE IF EXISTS measurements;
    DROP TABLE IF EXISTS users;
  `);
}

export async function initializeDatabase(): Promise<void> {
  const database = await getDatabase();

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      height_cm REAL,
      age INTEGER,
      gender TEXT,
      wake_time TEXT DEFAULT '07:00',
      sleep_time TEXT DEFAULT '23:00',
      goal_weight_kg REAL,
      weight_unit TEXT DEFAULT 'kg',
      height_unit TEXT DEFAULT 'cm',
      theme TEXT DEFAULT 'system',
      onboarding_complete INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS measurements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      measured_at TEXT NOT NULL,
      note TEXT,
      device_id TEXT,
      deleted_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      synced_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS daily_estimates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      estimated_weight_kg REAL,
      confidence_kg REAL,
      raw_mean_kg REAL,
      num_measurements INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      synced_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS bayesian_state (
      user_id TEXT PRIMARY KEY,
      state_json TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS tip_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tip_id TEXT NOT NULL,
      shown_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_measurements_user_date
      ON measurements(user_id, measured_at);
    CREATE INDEX IF NOT EXISTS idx_daily_estimates_user_date
      ON daily_estimates(user_id, date);
  `);

  // Migration: add deleted_at column if missing (for existing installs)
  try {
    await database.runAsync(
      `ALTER TABLE measurements ADD COLUMN deleted_at TEXT`
    );
  } catch {
    // Column already exists — ignore
  }
}

// --- User operations ---

export interface User {
  id: string;
  height_cm: number | null;
  age: number | null;
  gender: string | null;
  wake_time: string;
  sleep_time: string;
  goal_weight_kg: number | null;
  weight_unit: string;
  height_unit: string;
  theme: string;
  onboarding_complete: number;
}

export async function getUser(): Promise<User | null> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<User>('SELECT * FROM users LIMIT 1');
  return result ?? null;
}

export async function createUser(user: Partial<User> & { id: string }): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO users (id, height_cm, age, gender, wake_time, sleep_time, goal_weight_kg, weight_unit, height_unit, theme, onboarding_complete)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      user.height_cm ?? null,
      user.age ?? null,
      user.gender ?? null,
      user.wake_time ?? '07:00',
      user.sleep_time ?? '23:00',
      user.goal_weight_kg ?? null,
      user.weight_unit ?? 'kg',
      user.height_unit ?? 'cm',
      user.theme ?? 'system',
      user.onboarding_complete ?? 0,
    ]
  );
}

export async function updateUser(id: string, updates: Partial<User>): Promise<void> {
  const database = await getDatabase();
  const fields = Object.keys(updates).filter(k => k !== 'id');
  if (fields.length === 0) return;

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => (updates as any)[f]);

  await database.runAsync(
    `UPDATE users SET ${setClause}, updated_at = datetime('now') WHERE id = ?`,
    [...values, id]
  );
}

// --- Measurement operations ---

export interface MeasurementRow {
  id: string;
  user_id: string;
  weight_kg: number;
  measured_at: string;
  note: string | null;
}

export async function addMeasurement(measurement: {
  id: string;
  user_id: string;
  weight_kg: number;
  measured_at: string;
  note?: string;
}): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO measurements (id, user_id, weight_kg, measured_at, note)
     VALUES (?, ?, ?, ?, ?)`,
    [measurement.id, measurement.user_id, measurement.weight_kg, measurement.measured_at, measurement.note ?? null]
  );
}

export async function getMeasurements(
  userId: string,
  limit?: number,
  offset?: number
): Promise<MeasurementRow[]> {
  const database = await getDatabase();
  let query = 'SELECT * FROM measurements WHERE user_id = ? AND deleted_at IS NULL ORDER BY measured_at DESC';
  const params: any[] = [userId];

  if (limit) {
    query += ' LIMIT ?';
    params.push(limit);
  }
  if (offset) {
    query += ' OFFSET ?';
    params.push(offset);
  }

  return await database.getAllAsync<MeasurementRow>(query, params);
}

export async function getAllMeasurementsChronological(userId: string): Promise<MeasurementRow[]> {
  const database = await getDatabase();
  return await database.getAllAsync<MeasurementRow>(
    'SELECT * FROM measurements WHERE user_id = ? AND deleted_at IS NULL ORDER BY measured_at ASC',
    [userId]
  );
}

export async function deleteMeasurement(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE measurements SET deleted_at = datetime('now') WHERE id = ?`,
    [id]
  );
}

export async function clearAllMeasurements(userId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE measurements SET deleted_at = datetime('now') WHERE user_id = ? AND deleted_at IS NULL`,
    [userId]
  );
  // Also clear derived data
  await database.runAsync('DELETE FROM daily_estimates WHERE user_id = ?', [userId]);
  await database.runAsync('DELETE FROM bayesian_state WHERE user_id = ?', [userId]);
}

// --- Bayesian state persistence ---

export async function saveBayesianState(userId: string, stateJson: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO bayesian_state (user_id, state_json, updated_at)
     VALUES (?, ?, datetime('now'))`,
    [userId, stateJson]
  );
}

export async function getBayesianState(userId: string): Promise<string | null> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ state_json: string }>(
    'SELECT state_json FROM bayesian_state WHERE user_id = ?',
    [userId]
  );
  return result?.state_json ?? null;
}

// --- Daily estimates ---

export async function saveDailyEstimate(estimate: {
  id: string;
  user_id: string;
  date: string;
  estimated_weight_kg: number;
  confidence_kg: number;
  raw_mean_kg: number;
  num_measurements: number;
}): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO daily_estimates (id, user_id, date, estimated_weight_kg, confidence_kg, raw_mean_kg, num_measurements)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [estimate.id, estimate.user_id, estimate.date, estimate.estimated_weight_kg, estimate.confidence_kg, estimate.raw_mean_kg, estimate.num_measurements]
  );
}

export async function getDailyEstimates(
  userId: string,
  days?: number
): Promise<Array<{
  date: string;
  estimated_weight_kg: number;
  confidence_kg: number;
  raw_mean_kg: number;
  num_measurements: number;
}>> {
  const database = await getDatabase();
  let query = 'SELECT * FROM daily_estimates WHERE user_id = ? ORDER BY date DESC';
  const params: any[] = [userId];

  if (days) {
    query = `SELECT * FROM daily_estimates WHERE user_id = ? AND date >= date('now', '-${days} days') ORDER BY date ASC`;
  }

  return await database.getAllAsync(query, params);
}

// --- Tip history ---

export async function recordTipShown(id: string, userId: string, tipId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO tip_history (id, user_id, tip_id) VALUES (?, ?, ?)',
    [id, userId, tipId]
  );
}

export async function getRecentTipIds(userId: string): Promise<string[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ tip_id: string }>(
    'SELECT tip_id FROM tip_history WHERE user_id = ? ORDER BY shown_at DESC LIMIT 20',
    [userId]
  );
  return rows.map(r => r.tip_id);
}
