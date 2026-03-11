// Bayesian weight estimation engine for Scaley
//
// Model: observed_weight = true_weight + time_offset(hour) + noise
// Uses conjugate Normal-Normal updates for closed-form posterior computation.

export interface PriorState {
  // True weight estimate
  weightMean: number;      // kg
  weightVariance: number;  // kg²

  // Time-of-day offsets (24 hour buckets)
  // Population prior: weight increases ~0.5-2.0 kg through the day
  hourOffsets: Array<{
    mean: number;          // kg offset from morning baseline
    variance: number;      // kg²
    sampleCount: number;
  }>;

  totalMeasurements: number;
}

// Measurement noise variance (scale precision ~0.1-0.3 kg)
const SCALE_NOISE_VARIANCE = 0.04; // (0.2 kg)²

// Population-based prior for hourly offsets (research-based)
// Weight typically increases 0.5-2.0 kg from morning to evening
function getPopulationHourOffset(hour: number): number {
  // Sinusoidal model: lowest at ~6 AM, highest at ~8 PM
  // Amplitude of ~0.75 kg (conservative)
  const peakHour = 20; // 8 PM
  const troughHour = 6; // 6 AM
  const midpoint = (peakHour + troughHour) / 2;
  const amplitude = 0.75;
  return amplitude * Math.sin(((hour - troughHour) / (peakHour - troughHour)) * Math.PI);
}

export function createInitialPrior(firstWeightKg?: number): PriorState {
  const hourOffsets = Array.from({ length: 24 }, (_, hour) => ({
    mean: getPopulationHourOffset(hour),
    variance: 1.0,        // High initial uncertainty (1 kg² per hour bucket)
    sampleCount: 0,
  }));

  return {
    weightMean: firstWeightKg ?? 70,   // Default prior mean
    weightVariance: firstWeightKg ? 4.0 : 400.0, // Wide prior if no data
    hourOffsets,
    totalMeasurements: 0,
  };
}

export interface Measurement {
  weightKg: number;
  measuredAt: Date;
}

export interface PosteriorResult {
  // Updated state
  state: PriorState;
  // Human-readable outputs
  estimatedTrueWeight: number;       // Posterior mean (normalized to morning)
  confidence: number;                 // Posterior std dev
  timeOffset: number;                 // Learned offset for this hour
}

export function updatePosterior(
  prior: PriorState,
  measurement: Measurement
): PosteriorResult {
  const hour = measurement.measuredAt.getHours();
  const hourBucket = prior.hourOffsets[hour];

  // Step 1: Compute expected weight at this hour
  // expected = true_weight + hour_offset
  // observation = expected + noise
  // So: observation - hour_offset = true_weight + noise
  const adjustedObservation = measurement.weightKg - hourBucket.mean;

  // Step 2: Update true weight estimate (Normal-Normal conjugate update)
  const totalObsVariance = SCALE_NOISE_VARIANCE + hourBucket.variance;
  const newWeightVariance = 1 / (1 / prior.weightVariance + 1 / totalObsVariance);
  const newWeightMean =
    newWeightVariance *
    (prior.weightMean / prior.weightVariance + adjustedObservation / totalObsVariance);

  // Step 3: Update hour offset estimate
  // residual = observation - estimated_true_weight
  const residual = measurement.weightKg - newWeightMean;
  const offsetObsVariance = SCALE_NOISE_VARIANCE + newWeightVariance;
  const newOffsetVariance = 1 / (1 / hourBucket.variance + 1 / offsetObsVariance);
  const newOffsetMean =
    newOffsetVariance *
    (hourBucket.mean / hourBucket.variance + residual / offsetObsVariance);

  // Step 4: Build updated state
  const newHourOffsets = [...prior.hourOffsets];
  newHourOffsets[hour] = {
    mean: newOffsetMean,
    variance: newOffsetVariance,
    sampleCount: hourBucket.sampleCount + 1,
  };

  const newState: PriorState = {
    weightMean: newWeightMean,
    weightVariance: newWeightVariance,
    hourOffsets: newHourOffsets,
    totalMeasurements: prior.totalMeasurements + 1,
  };

  return {
    state: newState,
    estimatedTrueWeight: newWeightMean,
    confidence: Math.sqrt(newWeightVariance),
    timeOffset: newOffsetMean,
  };
}

// Process multiple measurements in chronological order
export function processAllMeasurements(measurements: Measurement[]): PosteriorResult | null {
  if (measurements.length === 0) return null;

  const sorted = [...measurements].sort(
    (a, b) => a.measuredAt.getTime() - b.measuredAt.getTime()
  );

  let state = createInitialPrior(sorted[0].weightKg);
  let result: PosteriorResult | null = null;

  for (const m of sorted) {
    result = updatePosterior(state, m);
    state = result.state;
  }

  return result;
}

// Get the best time to weigh in (lowest offset variance = most reliable)
export function getBestMeasurementTime(state: PriorState): {
  hour: number;
  formatted: string;
} {
  let bestHour = 7; // default
  let lowestVariance = Infinity;

  for (let h = 5; h <= 22; h++) { // reasonable waking hours
    if (state.hourOffsets[h].variance < lowestVariance && state.hourOffsets[h].sampleCount > 0) {
      lowestVariance = state.hourOffsets[h].variance;
      bestHour = h;
    }
  }

  const period = bestHour >= 12 ? 'PM' : 'AM';
  const displayHour = bestHour > 12 ? bestHour - 12 : bestHour === 0 ? 12 : bestHour;
  return { hour: bestHour, formatted: `${displayHour}:00 ${period}` };
}

// Calculate daily weight trend (exponential moving average on posterior means)
export function calculateTrend(
  dailyEstimates: Array<{ date: string; weight: number }>,
  alpha: number = 0.3 // smoothing factor
): Array<{ date: string; weight: number; trend: number }> {
  if (dailyEstimates.length === 0) return [];

  const result: Array<{ date: string; weight: number; trend: number }> = [];
  let ema = dailyEstimates[0].weight;

  for (const entry of dailyEstimates) {
    ema = alpha * entry.weight + (1 - alpha) * ema;
    result.push({ ...entry, trend: ema });
  }

  return result;
}
