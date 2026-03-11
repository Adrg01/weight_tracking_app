// Demo data for testing — generates realistic weight tracking data
// Female, 25 years, in the ideal BMI range, positive trajectory

export interface DemoMeasurement {
  weight_kg: number;
  measured_at: string;
  note?: string;
}

export function generateDemoData(): DemoMeasurement[] {
  const measurements: DemoMeasurement[] = [];
  const now = new Date();

  // Starting weight: 65 kg (BMI ~21.2 for 175cm), trending down to ~62 kg
  // This keeps BMI in the "Normal" range (20-22 range)
  const startWeight = 65.0;
  const dailyLoss = 0.1;

  const notes = [
    'Morning fasted',
    'After yoga',
    'Before bed',
    'After lunch',
    'Morning',
    'Post workout',
    undefined,
    undefined,
    undefined,
  ];

  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    const dayIndex = 30 - daysAgo;
    const trueWeight = startWeight - dailyLoss * dayIndex
      + 0.25 * Math.sin(dayIndex / 7 * Math.PI * 2);

    const numMeasurements = daysAgo === 0 ? 1 : Math.random() < 0.3 ? 1 : Math.random() < 0.6 ? 2 : 3;

    const timeslots = [
      { hour: 7, min: Math.floor(Math.random() * 30), offset: -0.3 },
      { hour: 12, min: Math.floor(Math.random() * 60), offset: 0.5 },
      { hour: 20, min: Math.floor(Math.random() * 60), offset: 1.0 },
    ];

    const selectedSlots = timeslots
      .sort(() => Math.random() - 0.5)
      .slice(0, numMeasurements);

    for (const slot of selectedSlots) {
      const measuredAt = new Date(date);
      measuredAt.setHours(slot.hour, slot.min, 0, 0);

      const noise = (Math.random() - 0.5) * 0.4;
      const observed = trueWeight + slot.offset + noise;

      measurements.push({
        weight_kg: Math.round(observed * 10) / 10,
        measured_at: measuredAt.toISOString(),
        note: notes[Math.floor(Math.random() * notes.length)],
      });
    }
  }

  return measurements.sort(
    (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
  );
}
