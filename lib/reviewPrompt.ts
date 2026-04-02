import * as StoreReview from "expo-store-review";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  FIRST_USE: "@scaley_review_first_use",
  DISMISS_COUNT: "@scaley_review_dismiss_count",
  LAST_DISMISS: "@scaley_review_last_dismiss",
  COMPLETED: "@scaley_review_completed",
} as const;

const MIN_MEASUREMENTS = 7;
const MIN_DAYS_SINCE_FIRST_USE = 3;
const MAX_DISMISSALS = 3;
const MIN_DAYS_SINCE_LAST_DISMISS = 14;

let shownThisSession = false;

/**
 * Call this after logging a weight measurement. It silently checks all
 * conditions and requests a review only when appropriate. Never throws,
 * never blocks the user.
 */
export async function maybeRequestReview(
  measurementCount: number
): Promise<void> {
  try {
    if (shownThisSession) return;

    // Enough measurements?
    if (measurementCount < MIN_MEASUREMENTS) return;

    // Already completed a review?
    const completed = await AsyncStorage.getItem(KEYS.COMPLETED);
    if (completed === "true") return;

    // Too many dismissals?
    const dismissCountRaw = await AsyncStorage.getItem(KEYS.DISMISS_COUNT);
    const dismissCount = dismissCountRaw ? parseInt(dismissCountRaw, 10) : 0;
    if (dismissCount >= MAX_DISMISSALS) return;

    // Record first use if not already set
    const now = Date.now();
    let firstUse = await AsyncStorage.getItem(KEYS.FIRST_USE);
    if (!firstUse) {
      await AsyncStorage.setItem(KEYS.FIRST_USE, now.toString());
      firstUse = now.toString();
    }

    // Enough days since first use?
    const daysSinceFirstUse =
      (now - parseInt(firstUse, 10)) / (1000 * 60 * 60 * 24);
    if (daysSinceFirstUse < MIN_DAYS_SINCE_FIRST_USE) return;

    // Enough days since last dismissal?
    const lastDismiss = await AsyncStorage.getItem(KEYS.LAST_DISMISS);
    if (lastDismiss) {
      const daysSinceLastDismiss =
        (now - parseInt(lastDismiss, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceLastDismiss < MIN_DAYS_SINCE_LAST_DISMISS) return;
    }

    // All conditions met — check platform availability and request
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return;

    shownThisSession = true;
    await StoreReview.requestReview();

    // We can't know for certain whether the user completed the review or
    // dismissed it (the OS doesn't tell us), so we count every prompt as a
    // potential dismissal. If the user truly reviewed, they can tap "Rate
    // this app" in settings which calls requestReviewManually().
    await AsyncStorage.setItem(KEYS.DISMISS_COUNT, (dismissCount + 1).toString());
    await AsyncStorage.setItem(KEYS.LAST_DISMISS, now.toString());
  } catch {
    // Silently swallow — never interrupt the user's flow.
  }
}

/**
 * Call when the user explicitly taps "Rate this app" in settings.
 * Always shows the review dialog regardless of conditions, and marks the
 * review as completed so automatic prompts stop.
 */
export async function requestReviewManually(): Promise<void> {
  await StoreReview.requestReview();
  await AsyncStorage.setItem(KEYS.COMPLETED, "true");
}
