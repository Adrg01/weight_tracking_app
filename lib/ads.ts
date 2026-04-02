// AdMob integration for Scaley
// Uses Google test ad IDs — replace with real IDs before production release

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let mobileAds: any = null;
let InterstitialAd: any = null;
let AdEventType: any = {};
let TestIds: any = { BANNER: '', INTERSTITIAL: '' };

try {
  const ads = require('react-native-google-mobile-ads');
  mobileAds = ads.default;
  InterstitialAd = ads.InterstitialAd;
  AdEventType = ads.AdEventType;
  TestIds = ads.TestIds;
} catch {
  // Native module not available (Expo Go)
}

const INTERSTITIAL_COUNT_KEY = '@scaley_log_count_since_ad';
const INTERSTITIAL_EVERY_N_LOGS = 3;

// Test Ad Unit IDs — swap these for production
// TODO: Replace with real Ad Unit IDs before production release
// Using test IDs for now so ads render in both dev and preview builds
export const BANNER_AD_UNIT_ID = Platform.select({
  android: 'ca-app-pub-7925989043709506/3882139609',
  ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  default: '',
})!;

export const INTERSTITIAL_AD_UNIT_ID = Platform.select({
  android: 'ca-app-pub-7925989043709506/9673522330',
  ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  default: '',
})!;

// Use test IDs until real ones are configured
const HAS_REAL_ADS = !BANNER_AD_UNIT_ID.includes('XXXX');
export const EFFECTIVE_BANNER_ID = HAS_REAL_ADS ? BANNER_AD_UNIT_ID : TestIds.BANNER;
export const EFFECTIVE_INTERSTITIAL_ID = HAS_REAL_ADS ? INTERSTITIAL_AD_UNIT_ID : TestIds.INTERSTITIAL;

export async function initializeAds(): Promise<void> {
  try {
    await mobileAds().initialize();
  } catch (e) {
    console.warn('Ad init failed:', e);
  }
}

// Show interstitial ad every N weight logs
export async function showPeriodicInterstitial(): Promise<void> {
  try {
    if (!InterstitialAd) return;

    const raw = await AsyncStorage.getItem(INTERSTITIAL_COUNT_KEY);
    const count = (parseInt(raw ?? '0', 10) || 0) + 1;

    if (count < INTERSTITIAL_EVERY_N_LOGS) {
      await AsyncStorage.setItem(INTERSTITIAL_COUNT_KEY, count.toString());
      return; // Not time yet
    }

    const interstitial = InterstitialAd.createForAdRequest(EFFECTIVE_INTERSTITIAL_ID);

    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        resolve(); // Don't block if ad takes too long to load
      }, 5000);

      interstitial.addAdEventListener(AdEventType.LOADED, () => {
        clearTimeout(timeout);
        interstitial.show();
      });

      interstitial.addAdEventListener(AdEventType.CLOSED, async () => {
        await AsyncStorage.setItem(INTERSTITIAL_COUNT_KEY, '0'); // Reset counter
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
