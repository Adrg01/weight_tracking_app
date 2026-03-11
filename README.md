# Scaley

A smart weight tracking app that uses Bayesian estimation to filter out daily fluctuations and show your true weight trend.

## Features

- **Bayesian Weight Estimation** — Learns your body's daily pattern (morning vs evening) and calculates your real weight, free from water and food fluctuations
- **Interactive Weight Chart** — Tap any point for details. Shows recorded weight (solid line), estimated true weight (red dashed), and goal weight (green dashed)
- **BMI Tracking** — Visual BMI scale with category indicator
- **Goal Progress** — Set a weight goal and track progress with direction-aware messaging
- **Science-Backed Tips** — 60+ tips tailored to your goal direction (lose/gain/maintain), covering nutrition, exercise, sleep, hydration, and more
- **Smart Reminders** — Notifications scheduled during your idle time based on wake/sleep schedule
- **Light/Dark/System Theme** — Cerulean blue branding throughout
- **Unit Support** — kg/lbs for weight, cm/ft+in for height, with automatic conversion

## Tech Stack

- **React Native** (Expo SDK 54) with TypeScript
- **Expo Router** for file-based navigation
- **SQLite** (expo-sqlite) for local-first storage
- **react-native-svg** for interactive charts
- **expo-notifications** for smart reminders

## Getting Started

### Prerequisites

- Node.js 18+
- Expo Go app on your phone (for development)
- npm

### Install & Run

```bash
npm install
npx expo start --tunnel
```

Scan the QR code with Expo Go on your phone.

### Build Standalone APK

```bash
eas login
eas build --profile preview --platform android
```

## Project Structure

```
app/
  _layout.tsx          # Root layout with theme + auth redirect
  onboarding.tsx       # Showcase slides + setup form
  (tabs)/
    index.tsx          # Dashboard
    history.tsx        # Weight history with filters
    insights.tsx       # Tips and personalized insights
    settings.tsx       # Profile, units, theme, reminders, data
components/
  WeightChart.tsx      # Interactive SVG line chart
  LogWeightModal.tsx   # Weight logging modal
  AnalogTimePicker.tsx # Draggable analog clock picker
  SwipeableTab.tsx     # Swipe navigation wrapper
contexts/
  AppContext.tsx        # Global state (user, measurements, Bayesian, tips)
lib/
  bayesian.ts          # Normal-Normal conjugate update engine
  database.ts          # SQLite schema and CRUD operations
  notifications.ts     # Smart reminder scheduling
  tips.ts              # 60+ categorized tips with goal filtering
  units.ts             # Weight/height conversion and formatting
  demoData.ts          # Dev-only sample data (__DEV__ gated)
```

## Architecture Notes

- **Bayesian Engine**: Normal-Normal conjugate updates with 24 hourly offset buckets and population-based sinusoidal priors. Closed-form computation — no sampling needed.
- **Sync-Ready Schema**: All tables use UUIDs, `synced_at` timestamps, and soft deletes (`deleted_at`) for future cloud sync.
- **Demo Mode**: Automatically active in development (`__DEV__`), impossible to ship to production. Reseeds 30 days of realistic data on each launch.

## Roadmap

### Phase 1 (Current — MVP)
- [x] Weight logging with Bayesian estimation
- [x] Dashboard, charts, BMI, tips
- [x] Onboarding flow
- [x] Smart notifications
- [x] Settings with analog clock picker
- [ ] Google AdMob integration

### Phase 2
- [ ] Firebase Auth + Firestore sync
- [ ] Health Connect sleep integration
- [ ] Correlation insights
- [ ] Water tracking
- [ ] Data export (CSV/PDF)

## License

Proprietary. All rights reserved.
