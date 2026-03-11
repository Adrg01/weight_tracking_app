// Global app context for Scaley
// Manages user state, theme preference, and shared data

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import {
  initializeDatabase,
  resetDatabase,
  getUser,
  createUser,
  updateUser,
  getMeasurements,
  getAllMeasurementsChronological,
  addMeasurement,
  deleteMeasurement,
  clearAllMeasurements,
  saveBayesianState,
  getBayesianState,
  getRecentTipIds,
  recordTipShown,
  saveDailyEstimate,
  User,
  MeasurementRow,
} from '@/lib/database';
import {
  PriorState,
  PosteriorResult,
  createInitialPrior,
  updatePosterior,
  processAllMeasurements,
} from '@/lib/bayesian';
import { getNextTip, Tip, GoalDirection } from '@/lib/tips';
import { WeightUnit, HeightUnit } from '@/lib/units';
import { generateDemoData } from '@/lib/demoData';
import { scheduleWeighInReminders, cancelAllReminders } from '@/lib/notifications';
import { initializeAds } from '@/lib/ads';

// Demo mode: automatically true in development, always false in production builds
const DEMO_MODE = __DEV__;

type ThemePreference = 'system' | 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';

interface AppContextType {
  // Loading
  isLoading: boolean;

  // User
  user: User | null;
  saveUser: (data: Partial<User> & { id?: string }) => Promise<void>;

  // Theme
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (pref: ThemePreference) => Promise<void>;

  // Units
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
  setWeightUnit: (unit: WeightUnit) => Promise<void>;
  setHeightUnit: (unit: HeightUnit) => Promise<void>;

  // Measurements
  measurements: MeasurementRow[];
  logWeight: (weightKg: number, note?: string) => Promise<void>;
  removeWeight: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  refreshMeasurements: () => Promise<void>;

  // Bayesian
  bayesianResult: PosteriorResult | null;
  bayesianState: PriorState | null;

  // Tips
  currentTip: Tip | null;
  refreshTip: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [measurements, setMeasurements] = useState<MeasurementRow[]>([]);
  const [bayesianState, setBayesianState] = useState<PriorState | null>(null);
  const [bayesianResult, setBayesianResult] = useState<PosteriorResult | null>(null);
  const [currentTip, setCurrentTip] = useState<Tip | null>(null);
  const [themePreference, setThemePrefState] = useState<ThemePreference>('system');

  const resolvedTheme: ResolvedTheme =
    themePreference === 'system'
      ? (systemScheme === 'dark' ? 'dark' : 'light')
      : themePreference;

  // Initialize app
  useEffect(() => {
    (async () => {
      try {
        // In demo mode: wipe everything and reseed fresh every time
        if (DEMO_MODE) {
          await resetDatabase();
        }

        await initializeDatabase();

        if (DEMO_MODE) {
          const demoUserId = generateUUID();
          await createUser({
            id: demoUserId,
            height_cm: 165,
            age: 25,
            gender: 'female',
            wake_time: '07:00',
            sleep_time: '23:00',
            goal_weight_kg: 58,
            weight_unit: 'kg',
            height_unit: 'cm',
            theme: 'system',
            onboarding_complete: 1,
          });

          const demoData = generateDemoData();
          for (const m of demoData) {
            await addMeasurement({
              id: generateUUID(),
              user_id: demoUserId,
              weight_kg: m.weight_kg,
              measured_at: m.measured_at,
              note: m.note,
            });
          }
        }

        let existingUser = await getUser();

        if (existingUser) {
          setUser(existingUser);
          setThemePrefState(existingUser.theme as ThemePreference);

          // Load measurements
          const m = await getMeasurements(existingUser.id, 200);
          setMeasurements(m);

          // Load/rebuild Bayesian state
          await rebuildBayesian(existingUser.id);

          // Load tip
          await loadTip(existingUser.id);

          // Initialize ads and schedule notifications
          if (existingUser.onboarding_complete) {
            initializeAds().catch(() => {});
            scheduleWeighInReminders(
              existingUser.wake_time ?? '07:00',
              existingUser.sleep_time ?? '23:00'
            ).catch(() => {});
          }
        }
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const rebuildBayesian = async (userId: string) => {
    const savedState = await getBayesianState(userId);
    if (savedState) {
      try {
        const state = JSON.parse(savedState) as PriorState;
        setBayesianState(state);
        // Compute latest result from state
        const allM = await getAllMeasurementsChronological(userId);
        if (allM.length > 0) {
          const result = processAllMeasurements(
            allM.map(m => ({ weightKg: m.weight_kg, measuredAt: new Date(m.measured_at) }))
          );
          setBayesianResult(result);
        }
        return;
      } catch {}
    }

    // Rebuild from scratch
    const allM = await getAllMeasurementsChronological(userId);
    if (allM.length > 0) {
      const result = processAllMeasurements(
        allM.map(m => ({ weightKg: m.weight_kg, measuredAt: new Date(m.measured_at) }))
      );
      if (result) {
        setBayesianState(result.state);
        setBayesianResult(result);
        await saveBayesianState(userId, JSON.stringify(result.state));
      }
    }
  };

  const getGoalDirection = (u: User | null, latestWeightKg?: number): GoalDirection => {
    if (!u?.goal_weight_kg || !latestWeightKg) return 'lose';
    if (latestWeightKg < u.goal_weight_kg) return 'gain';
    if (latestWeightKg > u.goal_weight_kg) return 'lose';
    return 'maintain';
  };

  const loadTip = async (userId: string) => {
    const recentIds = await getRecentTipIds(userId);
    const currentUser = await getUser();
    const latestM = await getMeasurements(userId, 1);
    const direction = getGoalDirection(currentUser, latestM[0]?.weight_kg);
    const tip = getNextTip(recentIds, direction);
    setCurrentTip(tip);
  };

  const saveUser = useCallback(async (data: Partial<User> & { id?: string }) => {
    if (user) {
      await updateUser(user.id, data);
      const updated = { ...user, ...data } as User;
      setUser(updated);

      // Reschedule notifications if wake/sleep time or onboarding changed
      if (data.wake_time || data.sleep_time || data.onboarding_complete) {
        scheduleWeighInReminders(
          updated.wake_time ?? '07:00',
          updated.sleep_time ?? '23:00'
        ).catch(() => {});
      }
    } else if (data.id) {
      await createUser(data as User & { id: string });
      const newUser = await getUser();
      setUser(newUser);

      // Schedule notifications after onboarding
      if (data.onboarding_complete && newUser) {
        scheduleWeighInReminders(
          newUser.wake_time ?? '07:00',
          newUser.sleep_time ?? '23:00'
        ).catch(() => {});
      }
    }
  }, [user]);

  const setThemePreference = useCallback(async (pref: ThemePreference) => {
    setThemePrefState(pref);
    if (user) {
      await updateUser(user.id, { theme: pref });
    }
  }, [user]);

  const setWeightUnit = useCallback(async (unit: WeightUnit) => {
    if (user) {
      await updateUser(user.id, { weight_unit: unit } as any);
      setUser(prev => prev ? { ...prev, weight_unit: unit } : null);
    }
  }, [user]);

  const setHeightUnit = useCallback(async (unit: HeightUnit) => {
    if (user) {
      await updateUser(user.id, { height_unit: unit } as any);
      setUser(prev => prev ? { ...prev, height_unit: unit } : null);
    }
  }, [user]);

  const logWeight = useCallback(async (weightKg: number, note?: string) => {
    if (!user) return;

    const id = generateUUID();
    const now = new Date().toISOString();

    await addMeasurement({
      id,
      user_id: user.id,
      weight_kg: weightKg,
      measured_at: now,
      note,
    });

    // Update Bayesian state
    const currentState = bayesianState ?? createInitialPrior(weightKg);
    const result = updatePosterior(currentState, {
      weightKg,
      measuredAt: new Date(now),
    });

    setBayesianState(result.state);
    setBayesianResult(result);
    await saveBayesianState(user.id, JSON.stringify(result.state));

    // Save daily estimate
    const dateStr = now.split('T')[0];
    await saveDailyEstimate({
      id: generateUUID(),
      user_id: user.id,
      date: dateStr,
      estimated_weight_kg: result.estimatedTrueWeight,
      confidence_kg: result.confidence,
      raw_mean_kg: weightKg,
      num_measurements: result.state.totalMeasurements,
    });

    // Refresh measurements list
    const updated = await getMeasurements(user.id, 100);
    setMeasurements(updated);

    // Cancel today's remaining reminders (they'll fire again tomorrow)
    cancelAllReminders().then(() => {
      scheduleWeighInReminders(user.wake_time ?? '07:00', user.sleep_time ?? '23:00');
    }).catch(() => {});
  }, [user, bayesianState]);

  const removeWeight = useCallback(async (id: string) => {
    if (!user) return;
    await deleteMeasurement(id);
    const updated = await getMeasurements(user.id, 100);
    setMeasurements(updated);
    await rebuildBayesian(user.id);
  }, [user]);

  const clearHistory = useCallback(async () => {
    if (!user) return;
    await clearAllMeasurements(user.id);
    setMeasurements([]);
    setBayesianState(null);
    setBayesianResult(null);
  }, [user]);

  const refreshMeasurements = useCallback(async () => {
    if (!user) return;
    const m = await getMeasurements(user.id, 100);
    setMeasurements(m);
  }, [user]);

  const refreshTip = useCallback(async () => {
    if (!user) return;
    if (currentTip) {
      await recordTipShown(generateUUID(), user.id, currentTip.id);
    }
    await loadTip(user.id);
  }, [user, currentTip]);

  return (
    <AppContext.Provider
      value={{
        isLoading,
        user,
        saveUser,
        themePreference,
        resolvedTheme,
        setThemePreference,
        weightUnit: (user?.weight_unit as WeightUnit) ?? 'kg',
        heightUnit: (user?.height_unit as HeightUnit) ?? 'cm',
        setWeightUnit,
        setHeightUnit,
        measurements,
        logWeight,
        removeWeight,
        clearHistory,
        refreshMeasurements,
        bayesianResult,
        bayesianState,
        currentTip,
        refreshTip,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

// Simple UUID generator (no native dependency needed)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
