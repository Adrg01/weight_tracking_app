import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/Colors';
import { ftInToCm } from '@/lib/units';
import AnalogTimePicker from '@/components/AnalogTimePicker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Step = 'showcase' | 'basics' | 'height' | 'weight' | 'schedule';

// ─── Showcase slides (5 consolidated) ───
const SLIDES = [
  {
    title: 'Welcome to Scaley',
    subtitle: 'Your smart weight companion',
    illustration: 'dashboard',
    description: 'Track your weight with precision. Scaley filters out daily noise to show your true progress — whether you\'re losing, gaining, or maintaining.',
  },
  {
    title: 'Log & Track',
    subtitle: 'Simple and intuitive',
    illustration: 'logtrack',
    description: 'Tap the + button on the dashboard to log your weight anytime. Swipe between tabs to explore your history, insights, and settings. Tap any point on your chart for details.',
  },
  {
    title: 'Your True Weight',
    subtitle: 'Smarter than a scale',
    illustration: 'estimate',
    description: 'Weigh yourself morning or night — it doesn\'t matter. Scaley learns your body\'s daily pattern and calculates your real weight, free from water and food fluctuations.',
  },
  {
    title: 'Goals & Insights',
    subtitle: 'Personalized for you',
    illustration: 'goals',
    description: 'Set a weight goal and watch your progress. Get daily science-backed tips tailored to your journey. Scaley reminds you to weigh in during your idle time.',
  },
  {
    title: 'Ready?',
    subtitle: 'Let\'s set you up',
    illustration: 'ready',
    description: 'It takes less than a minute. We\'ll ask for a few basics to personalize your experience.',
  },
];

// Mini illustrations using styled Views (no images needed)
function SlideIllustration({ type, colors }: { type: string; colors: any }) {
  switch (type) {
    case 'dashboard':
      return (
        <View style={[illustStyles.container, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[illustStyles.label, { color: colors.textSecondary }]}>ESTIMATED TRUE WEIGHT</Text>
          <Text style={[illustStyles.bigNumber, { color: colors.text }]}>58.3 kg</Text>
          <Text style={[illustStyles.small, { color: colors.positive }]}>BMI 21.4 — Normal</Text>
          <View style={[illustStyles.bmiBar, { backgroundColor: colors.surfaceBorder }]}>
            <View style={[illustStyles.bmiFill, { backgroundColor: colors.positive, width: '45%' }]} />
          </View>
        </View>
      );
    case 'estimate':
      return (
        <View style={[illustStyles.container, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <View style={illustStyles.timeRow}>
            <View style={illustStyles.timeBlock}>
              <Text style={[illustStyles.timeLabel, { color: colors.textSecondary }]}>7 AM</Text>
              <Text style={[illustStyles.timeValue, { color: colors.tint }]}>57.8 kg</Text>
            </View>
            <Text style={[illustStyles.arrow, { color: colors.textSecondary }]}>{'\u2192'}</Text>
            <View style={illustStyles.timeBlock}>
              <Text style={[illustStyles.timeLabel, { color: colors.textSecondary }]}>9 PM</Text>
              <Text style={[illustStyles.timeValue, { color: colors.tint }]}>59.1 kg</Text>
            </View>
          </View>
          <View style={[illustStyles.divider, { backgroundColor: colors.surfaceBorder }]} />
          <Text style={[illustStyles.label, { color: colors.textSecondary }]}>SCALEY ADJUSTS TO</Text>
          <Text style={[illustStyles.bigNumber, { color: colors.positive }]}>58.3 kg</Text>
          <Text style={[illustStyles.small, { color: colors.textSecondary }]}>{'\u00B1'} 0.15 kg confidence</Text>
        </View>
      );
    case 'logtrack':
      return (
        <View style={[illustStyles.container, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          {/* FAB hint */}
          <View style={illustStyles.fabHintRow}>
            <View style={[illustStyles.miniFab, { backgroundColor: colors.tint }]}>
              <Text style={illustStyles.miniFabIcon}>+</Text>
            </View>
            <Text style={[illustStyles.fabHintText, { color: colors.text }]}>Tap to log weight</Text>
          </View>
          <View style={[illustStyles.divider, { backgroundColor: colors.surfaceBorder }]} />
          {/* Mini chart */}
          <View style={illustStyles.chartArea}>
            {[62, 61.5, 61, 60.2, 59.8, 59.3, 58.5].map((w, i) => {
              const height = 20 + (62 - w) * 12;
              return (
                <View key={i} style={illustStyles.chartBarWrap}>
                  <View style={[illustStyles.chartBar, { height, backgroundColor: colors.tint + (i === 6 ? 'FF' : '80') }]} />
                </View>
              );
            })}
          </View>
          <Text style={[illustStyles.small, { color: colors.textSecondary }]}>Interactive chart — tap any point for details</Text>
          <View style={[illustStyles.divider, { backgroundColor: colors.surfaceBorder }]} />
          {/* Swipe hint */}
          <View style={illustStyles.swipeHintRow}>
            <Text style={{ fontSize: 18, color: colors.textSecondary }}>{'\u2190'}</Text>
            <Text style={[illustStyles.small, { color: colors.textSecondary }]}>Swipe between tabs</Text>
            <Text style={{ fontSize: 18, color: colors.textSecondary }}>{'\u2192'}</Text>
          </View>
        </View>
      );
    case 'goals':
      return (
        <View style={[illustStyles.container, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          {/* Goal progress */}
          <Text style={[illustStyles.label, { color: colors.textSecondary }]}>GOAL PROGRESS</Text>
          <Text style={[illustStyles.bigNumber, { color: colors.text, fontSize: 24 }]}>3.7 kg to lose</Text>
          <View style={[illustStyles.progressBar, { backgroundColor: colors.surfaceBorder }]}>
            <View style={[illustStyles.progressFill, { backgroundColor: colors.positive, width: '62%' }]} />
          </View>
          <View style={[illustStyles.divider, { backgroundColor: colors.surfaceBorder }]} />
          {/* Tip sample */}
          <View style={[illustStyles.tipSample, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '30' }]}>
            <Text style={[illustStyles.notifTitle, { color: colors.tint }]}>Daily Tip</Text>
            <Text style={[illustStyles.notifBody, { color: colors.text }]}>Ragi malt is a calcium-rich drink that supports healthy weight gain.</Text>
          </View>
          {/* Reminder hint */}
          <View style={illustStyles.reminderHint}>
            <Text style={{ fontSize: 16 }}>{'\u23F0'}</Text>
            <Text style={[illustStyles.small, { color: colors.textSecondary }]}>Smart reminders during your idle time</Text>
          </View>
        </View>
      );
    case 'ready':
      return (
        <View style={[illustStyles.container, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '30' }]}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>{'\u2699'}</Text>
          <Text style={[illustStyles.bigNumber, { color: colors.tint, fontSize: 20 }]}>Quick Setup</Text>
          <View style={{ marginTop: 16, gap: 10, width: '100%' }}>
            {[
              { step: '1', label: 'Gender & age' },
              { step: '2', label: 'Height' },
              { step: '3', label: 'Goal weight (optional)' },
              { step: '4', label: 'Wake & sleep time' },
            ].map(item => (
              <View key={item.step} style={illustStyles.setupStep}>
                <View style={[illustStyles.stepCircle, { backgroundColor: colors.tint }]}>
                  <Text style={illustStyles.stepCircleText}>{item.step}</Text>
                </View>
                <Text style={[illustStyles.setupLabel, { color: colors.text }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    default:
      return null;
  }
}

export default function OnboardingScreen() {
  const { resolvedTheme, saveUser } = useApp();
  const colors = Colors[resolvedTheme];

  const [step, setStep] = useState<Step>('showcase');
  const [slideIndex, setSlideIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const [gender, setGender] = useState<string>('');
  const [age, setAge] = useState('');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft_in'>('cm');
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [goalWeight, setGoalWeight] = useState('');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [sleepTime, setSleepTime] = useState('23:00');
  const [showWakePicker, setShowWakePicker] = useState(false);
  const [showSleepPicker, setShowSleepPicker] = useState(false);

  const handleFinish = async () => {
    const heightValue =
      heightUnit === 'cm'
        ? parseFloat(heightCm) || null
        : heightFt
          ? ftInToCm(parseInt(heightFt) || 0, parseInt(heightIn) || 0)
          : null;

    const goalWeightKg =
      weightUnit === 'kg'
        ? parseFloat(goalWeight) || null
        : goalWeight
          ? (parseFloat(goalWeight) || 0) / 2.20462
          : null;

    await saveUser({
      id: generateUUID(),
      height_cm: heightValue,
      age: parseInt(age) || null,
      gender: gender || null,
      wake_time: wakeTime,
      sleep_time: sleepTime,
      goal_weight_kg: goalWeightKg,
      weight_unit: weightUnit,
      height_unit: heightUnit,
      theme: 'system',
      onboarding_complete: 1,
    });

    router.replace('/(tabs)');
  };

  const onSlideScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setSlideIndex(index);
  };

  // ─── Showcase (swipeable intro slides) ───
  if (step === 'showcase') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onSlideScroll}
          scrollEventThrottle={16}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
              <Text style={[styles.slideTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.slideSubtitle, { color: colors.tint }]}>{item.subtitle}</Text>
              <SlideIllustration type={item.illustration} colors={colors} />
              <Text style={[styles.slideDescription, { color: colors.textSecondary }]}>{item.description}</Text>
            </View>
          )}
        />

        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: colors.surfaceBorder },
                slideIndex === i && { backgroundColor: colors.tint, width: 20 },
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.showcaseButtons}>
          {slideIndex < SLIDES.length - 1 ? (
            <>
              <TouchableOpacity onPress={() => setStep('basics')}>
                <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextSlideButton, { backgroundColor: colors.tint }]}
                onPress={() => {
                  flatListRef.current?.scrollToIndex({ index: slideIndex + 1, animated: true });
                }}>
                <Text style={styles.nextSlideButtonText}>Next</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.getStartedButton, { backgroundColor: colors.tint }]}
              onPress={() => setStep('basics')}>
              <Text style={styles.getStartedButtonText}>Get Started</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ─── Onboarding form steps ───
  const renderStep = () => {
    switch (step) {
      case 'basics':
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>About You</Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              This helps us calculate your BMI and personalize insights.
            </Text>

            <Text style={[styles.label, { color: colors.text }]}>Gender</Text>
            <View style={styles.optionRow}>
              {['Male', 'Female', 'Other'].map(g => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.optionButton,
                    { borderColor: colors.surfaceBorder },
                    gender === g.toLowerCase() && { backgroundColor: colors.tint, borderColor: colors.tint },
                  ]}
                  onPress={() => setGender(g.toLowerCase())}>
                  <Text
                    style={[
                      styles.optionText,
                      { color: colors.text },
                      gender === g.toLowerCase() && { color: '#fff' },
                    ]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.text }]}>Age</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}
              keyboardType="number-pad"
              placeholder="25"
              placeholderTextColor={colors.textSecondary}
              value={age}
              onChangeText={setAge}
            />

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.tint }]}
              onPress={() => setStep('height')}>
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );

      case 'height':
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Your Height</Text>

            <View style={styles.unitToggle}>
              {(['cm', 'ft_in'] as const).map(u => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.unitButton,
                    { borderColor: colors.surfaceBorder },
                    heightUnit === u && { backgroundColor: colors.tint, borderColor: colors.tint },
                  ]}
                  onPress={() => setHeightUnit(u)}>
                  <Text
                    style={[
                      styles.unitButtonText,
                      { color: colors.text },
                      heightUnit === u && { color: '#fff' },
                    ]}>
                    {u === 'cm' ? 'cm' : 'ft / in'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {heightUnit === 'cm' ? (
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}
                keyboardType="decimal-pad"
                placeholder="165"
                placeholderTextColor={colors.textSecondary}
                value={heightCm}
                onChangeText={setHeightCm}
              />
            ) : (
              <View style={styles.ftInRow}>
                <TextInput
                  style={[styles.input, styles.halfInput, { color: colors.text, borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}
                  keyboardType="number-pad"
                  placeholder="5"
                  placeholderTextColor={colors.textSecondary}
                  value={heightFt}
                  onChangeText={setHeightFt}
                />
                <Text style={[styles.ftInLabel, { color: colors.textSecondary }]}>ft</Text>
                <TextInput
                  style={[styles.input, styles.halfInput, { color: colors.text, borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}
                  keyboardType="number-pad"
                  placeholder="5"
                  placeholderTextColor={colors.textSecondary}
                  value={heightIn}
                  onChangeText={setHeightIn}
                />
                <Text style={[styles.ftInLabel, { color: colors.textSecondary }]}>in</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.tint }]}
              onPress={() => setStep('weight')}>
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );

      case 'weight':
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Goal Weight</Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              Optional — you can set or change this later.
            </Text>

            <View style={styles.unitToggle}>
              {(['kg', 'lbs'] as const).map(u => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.unitButton,
                    { borderColor: colors.surfaceBorder },
                    weightUnit === u && { backgroundColor: colors.tint, borderColor: colors.tint },
                  ]}
                  onPress={() => setWeightUnit(u)}>
                  <Text
                    style={[
                      styles.unitButtonText,
                      { color: colors.text },
                      weightUnit === u && { color: '#fff' },
                    ]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}
              keyboardType="decimal-pad"
              placeholder={weightUnit === 'kg' ? '58' : '128'}
              placeholderTextColor={colors.textSecondary}
              value={goalWeight}
              onChangeText={setGoalWeight}
            />

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.tint }]}
              onPress={() => setStep('schedule')}>
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('schedule')}>
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        );

      case 'schedule':
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Your Schedule</Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              We'll use this to send smart reminders during your idle time.
            </Text>

            <Text style={[styles.label, { color: colors.text }]}>Wake up time</Text>
            <TouchableOpacity
              style={[styles.timeDisplay, { borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}
              onPress={() => { setShowWakePicker(!showWakePicker); setShowSleepPicker(false); }}>
              <Text style={[styles.timeDisplayText, { color: colors.text }]}>{wakeTime}</Text>
            </TouchableOpacity>
            {showWakePicker && (
              <View style={styles.pickerInline}>
                <AnalogTimePicker
                  initialHours={parseInt(wakeTime.split(':')[0]) || 7}
                  initialMinutes={parseInt(wakeTime.split(':')[1]) || 0}
                  colors={colors}
                  onCancel={() => setShowWakePicker(false)}
                  onConfirm={(h, m) => {
                    setWakeTime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
                    setShowWakePicker(false);
                  }}
                />
              </View>
            )}

            <Text style={[styles.label, { color: colors.text }]}>Sleep time</Text>
            <TouchableOpacity
              style={[styles.timeDisplay, { borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}
              onPress={() => { setShowSleepPicker(!showSleepPicker); setShowWakePicker(false); }}>
              <Text style={[styles.timeDisplayText, { color: colors.text }]}>{sleepTime}</Text>
            </TouchableOpacity>
            {showSleepPicker && (
              <View style={styles.pickerInline}>
                <AnalogTimePicker
                  initialHours={parseInt(sleepTime.split(':')[0]) || 23}
                  initialMinutes={parseInt(sleepTime.split(':')[1]) || 0}
                  colors={colors}
                  onCancel={() => setShowSleepPicker(false)}
                  onConfirm={(h, m) => {
                    setSleepTime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
                    setShowSleepPicker(false);
                  }}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.tint }]}
              onPress={handleFinish}>
              <Text style={styles.primaryButtonText}>Let's Go!</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {renderStep()}
      </ScrollView>
      <View style={styles.progressRow}>
        {['basics', 'height', 'weight', 'schedule'].map((s, i) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              { backgroundColor: colors.surfaceBorder },
              ['basics', 'height', 'weight', 'schedule'].indexOf(step) >= i && {
                backgroundColor: colors.tint,
              },
            ]}
          />
        ))}
      </View>
    </KeyboardAvoidingView>
  );
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Showcase slides
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 140,
  },
  slideTitle: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  slideSubtitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 24 },
  slideDescription: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: 20, paddingHorizontal: 8 },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  showcaseButtons: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: { fontSize: 15, padding: 8 },
  nextSlideButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  nextSlideButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  getStartedButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  getStartedButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  // Onboarding form
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  stepContainer: { alignItems: 'center' },
  stepTitle: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  stepSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', alignSelf: 'flex-start', marginBottom: 8, marginTop: 16 },
  input: {
    width: '100%',
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    marginBottom: 8,
  },
  optionRow: { flexDirection: 'row', gap: 12, marginBottom: 8, width: '100%' },
  optionButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { fontSize: 16, fontWeight: '500' },
  timeDisplay: {
    width: '100%',
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeDisplayText: { fontSize: 24, fontWeight: '600' },
  pickerInline: { marginBottom: 12, alignItems: 'center' },
  unitToggle: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  unitButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 20,
  },
  unitButtonText: { fontSize: 14, fontWeight: '600' },
  ftInRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', marginBottom: 8 },
  halfInput: { flex: 1 },
  ftInLabel: { fontSize: 16 },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  primaryButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 32,
  },
  progressDot: { width: 8, height: 8, borderRadius: 4 },
});

// Illustration styles
const illustStyles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  bigNumber: { fontSize: 36, fontWeight: '700' },
  small: { fontSize: 13, marginTop: 4 },
  bmiBar: { width: '80%', height: 6, borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  bmiFill: { height: '100%', borderRadius: 3 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  timeBlock: { alignItems: 'center' },
  timeLabel: { fontSize: 12, marginBottom: 2 },
  timeValue: { fontSize: 20, fontWeight: '700' },
  arrow: { fontSize: 20 },
  divider: { width: '100%', height: 1, marginVertical: 12 },
  insightRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, width: '100%' },
  insightText: { fontSize: 14, flex: 1 },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 80, marginBottom: 8 },
  chartBarWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  chartBar: { width: '70%', borderRadius: 3, minHeight: 8 },
  trendLine: { width: '80%', borderBottomWidth: 2, borderStyle: 'dashed', marginBottom: 8 },
  chartLegend: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendDotDash: { width: 12, height: 0, borderWidth: 1.5, borderStyle: 'dashed' },
  legendLabel: { fontSize: 11 },
  notifCard: { width: '100%', borderRadius: 12, borderWidth: 1, padding: 14 },
  notifTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  notifBody: { fontSize: 14, lineHeight: 20 },
  notifTime: { fontSize: 11, marginTop: 6 },
  // logtrack
  fabHintRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  miniFab: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  miniFabIcon: { color: '#fff', fontSize: 24, fontWeight: '300', lineHeight: 26, marginTop: 1 },
  fabHintText: { fontSize: 15, fontWeight: '600' },
  swipeHintRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  // goals
  progressBar: { width: '100%', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  tipSample: { width: '100%', borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  reminderHint: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  // ready
  setupStep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepCircleText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  setupLabel: { fontSize: 15 },
});
