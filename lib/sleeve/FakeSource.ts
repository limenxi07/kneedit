import { constant, createSubject } from './observable.ts';
import { createRandom, type Random } from './random.ts';
import type {
  DailyActivity,
  DeviceInfo,
  ExerciseMeasurement,
  ExerciseTracker,
  FallEvent,
  LiveSignal,
  SleeveSource,
  TrackerEvent,
} from './types.ts';

/**
 * Plausible, clearly fake sleeve data for demo accounts only: the Sleeve
 * tab's sample signals, and the history that scripts/seed-demo.mts writes.
 * Anything shown from it carries the "Sample data" tag.
 */

export type FakeSourceOptions = {
  /** Same seed, same data. */
  seed?: string;
  /** Milliseconds between live signals. */
  signalIntervalMs?: number;
  /** Milliseconds per rep while an exercise runs. */
  repIntervalMs?: number;
  now?: () => Date;
};

export const FAKE_DEVICE: DeviceInfo = {
  id: 'fake-sleeve-0001',
  firmware: '0.0.0-sample',
  knee: 'left',
  batteryPct: 82,
  worn: true,
  lastSyncAt: null,
  calibration: 'done',
};

/** A form score between 6 and 9.5, in half points. */
export function fakeFormScore(random: Random): number {
  return random.int(12, 19) / 2;
}

/** One day of fake all-day activity, the same for the same seed and date. */
export function fakeDailyActivity(seed: string, localDate: string): DailyActivity {
  const random = createRandom(`${seed}:activity:${localDate}`);
  const walkingMinutes = random.int(25, 75);
  const activeMinutes = walkingMinutes + random.int(10, 40);
  return {
    localDate,
    steps: walkingMinutes * random.int(80, 105),
    walkingMinutes,
    activeMinutes,
    sedentaryMinutes: random.int(420, 600),
    sitToStandCount: random.int(18, 45),
  };
}

/** A fake summary of what the sensors saw during one exercise. */
export function fakeSensorSummary(random: Random): Record<string, unknown> {
  return {
    maxKneeFlexionDeg: random.int(85, 115),
    averageTempoSec: random.int(25, 40) / 10,
    holdSec: random.int(20, 50) / 10,
  };
}

export function createFakeSource(options: FakeSourceOptions = {}): SleeveSource & {
  /** Demo only: pretend the sleeve noticed a possible fall. */
  simulateFall(): FallEvent;
} {
  const seed = options.seed ?? 'kneedit-demo';
  const now = options.now ?? (() => new Date());
  const signalIntervalMs = options.signalIntervalMs ?? 250;
  const repIntervalMs = options.repIntervalMs ?? 3000;
  const random = createRandom(seed);
  const fallListeners = new Set<(event: FallEvent) => void>();

  return {
    kind: 'fake',
    capabilities: {
      repCounting: true,
      formScore: true,
      liveSignals: true,
      dailyActivity: true,
      fallDetection: true,
      heartRate: true,
    },
    connection: constant('connected'),
    device: () => ({ ...FAKE_DEVICE, lastSyncAt: now().toISOString() }),

    startExercise({ repTarget }): ExerciseTracker {
      const events = createSubject<TrackerEvent | null>(null);
      let reps = 0;
      let timer: ReturnType<typeof setInterval> | null = null;
      const start = () => {
        timer ??= setInterval(() => {
          if (reps >= repTarget) return;
          reps++;
          events.set({ type: 'rep', count: reps });
        }, repIntervalMs);
      };
      const stop = () => {
        if (timer) clearInterval(timer);
        timer = null;
      };
      start();
      return {
        events,
        pause: stop,
        resume: start,
        finish(): ExerciseMeasurement {
          stop();
          const formScore = fakeFormScore(random);
          events.set({ type: 'formScore', score: formScore });
          return { repsDone: reps, formScore, sensorSummary: fakeSensorSummary(random) };
        },
      };
    },

    subscribeLiveSignals(listener) {
      let tick = 0;
      const timer = setInterval(() => {
        tick++;
        // A slow bend and straighten, about every 4 seconds, with a steady pulse.
        const phase = (tick * signalIntervalMs) / 4000;
        const signal: LiveSignal = {
          at: now().toISOString(),
          kneeAngleDeg: Math.round(45 - 45 * Math.cos(2 * Math.PI * phase)),
          heartRateBpm: 72 + Math.round(4 * Math.sin(2 * Math.PI * phase) + random.next() * 2),
        };
        listener(signal);
      }, signalIntervalMs);
      return () => clearInterval(timer);
    },

    getDailyActivity: async (localDate) => fakeDailyActivity(seed, localDate),

    subscribeFallEvents(listener) {
      fallListeners.add(listener);
      return () => {
        fallListeners.delete(listener);
      };
    },

    simulateFall() {
      const event: FallEvent = { detectedAt: now().toISOString(), details: { simulated: true } };
      for (const listener of [...fallListeners]) listener(event);
      return event;
    },
  };
}
