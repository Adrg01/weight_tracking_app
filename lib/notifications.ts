// Smart notification system for Scaley
// Schedules daily weigh-in reminders during the user's idle time

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getUser, hasLoggedToday } from '@/lib/database';

// Configure how notifications appear when app is in foreground
// Suppresses reminders if user already logged weight today
Notifications.setNotificationHandler({
  handleNotification: async () => {
    try {
      const user = await getUser();
      if (user) {
        const logged = await hasLoggedToday(user.id);
        if (logged) {
          return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
        }
      }
    } catch {}
    return {
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    };
  },
});

// Friendly reminder messages — rotated randomly
const REMINDER_MESSAGES = [
  { title: 'Quick weigh-in?', body: 'A few seconds now keeps your trend accurate.' },
  { title: 'Time to step on the scale', body: 'Consistency is the key to accurate tracking.' },
  { title: 'Hey! Got a moment?', body: 'A quick weigh-in helps Scaley learn your pattern.' },
  { title: 'Your scale misses you', body: 'Log a quick reading to keep your trend on track.' },
  { title: 'Weigh-in reminder', body: 'The more data points, the better your estimate.' },
  { title: 'Don\'t forget to weigh in', body: 'It only takes a second!' },
  { title: 'Scaley here!', body: 'Ready for today\'s reading whenever you are.' },
  { title: 'Good time to weigh in', body: 'Your weight trend gets smarter with each reading.' },
];

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Weigh-in Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100],
      lightColor: '#007BA7',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getNotificationPermissionStatus(): Promise<string> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

// Parse "HH:MM" to { hours, minutes }
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h || 0, minutes: m || 0 };
}

// Convert time to minutes since midnight
function toMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

// Pick a good reminder time between wake and sleep
// Strategy: schedule one in the morning window and one in the evening window
function calculateReminderTimes(
  wakeTime: string,
  sleepTime: string
): Array<{ hours: number; minutes: number }> {
  const wake = parseTime(wakeTime);
  const sleep = parseTime(sleepTime);

  const wakeMin = toMinutes(wake.hours, wake.minutes);
  const sleepMin = toMinutes(sleep.hours, sleep.minutes);

  // Handle normal case (wake before sleep)
  const awakeMinutes = sleepMin > wakeMin
    ? sleepMin - wakeMin
    : (1440 - wakeMin) + sleepMin;

  if (awakeMinutes < 120) {
    // Awake window too small — just one reminder 30 min after wake
    const reminderMin = (wakeMin + 30) % 1440;
    return [{ hours: Math.floor(reminderMin / 60), minutes: reminderMin % 60 }];
  }

  // Morning reminder: 30-60 min after waking (good for morning weigh-in)
  const morningMin = (wakeMin + 45) % 1440;

  // Evening reminder: ~2 hours before sleep (catch those who forgot)
  const eveningMin = (sleepMin - 120 + 1440) % 1440;

  const times = [
    { hours: Math.floor(morningMin / 60), minutes: morningMin % 60 },
  ];

  // Only add evening reminder if it's sufficiently separated from morning (3+ hours)
  const gap = ((eveningMin - morningMin) + 1440) % 1440;
  if (gap >= 180) {
    times.push({ hours: Math.floor(eveningMin / 60), minutes: eveningMin % 60 });
  }

  return times;
}

export async function scheduleWeighInReminders(
  wakeTime: string,
  sleepTime: string
): Promise<void> {
  // Cancel all existing scheduled notifications first
  await Notifications.cancelAllScheduledNotificationsAsync();

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const reminderTimes = calculateReminderTimes(wakeTime, sleepTime);

  for (let i = 0; i < reminderTimes.length; i++) {
    const time = reminderTimes[i];
    const msg = REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];

    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        ...(Platform.OS === 'android' && { channelId: 'reminders' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.hours,
        minute: time.minutes,
      },
    });
  }
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledReminders() {
  return await Notifications.getAllScheduledNotificationsAsync();
}
