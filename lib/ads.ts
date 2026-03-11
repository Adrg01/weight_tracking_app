// AdMob integration for Scaley
// Uses Google test ad IDs — replace with real IDs before production release

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import mobileAds, {
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

export { BannerAd, BannerAdSize };

const INTERSTITIAL_CAP_KEY = '@scaley_last_interstitial_date';

// Test Ad Unit IDs — swap these for production
export const BANNER_AD_UNIT_ID = __DEV__
  ? TestIds.BANNER
  : Platform.select({
      android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // Replace with real ID
      ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
      default: TestIds.BANNER,
    })!;

export const INTERSTITIAL_AD_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.select({
      android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // Replace with real ID
      ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
      default: TestIds.INTERSTITIAL,
    })!;

export async function initializeAds(): Promise<void> {
  try {
    await mobileAds().initialize();
  } catch (e) {
    console.warn('Ad init failed:', e);
  }
}

// Show interstitial ad — max 1 per day
export async function showDailyInterstitial(): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const lastShown = await AsyncStorage.getItem(INTERSTITIAL_CAP_KEY);

    if (lastShown === today) return; // Already shown today

    const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID);

    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        resolve(); // Don't block if ad takes too long to load
      }, 5000);

      interstitial.addAdEventListener(AdEventType.LOADED, () => {
        clearTimeout(timeout);
        interstitial.show();
      });

      interstitial.addAdEventListener(AdEventType.CLOSED, async () => {
        await AsyncStorage.setItem(INTERSTITIAL_CAP_KEY, today);
        resolve();
      });

      interstitial.addAdEventListener(AdEventType.ERROR, () => {
        clearTimeout(timeout);
        resolve(); // Fail silently — never block the user
      });

      interstitial.load();
    });
  } catch {
    // Fail silently
  }
}
