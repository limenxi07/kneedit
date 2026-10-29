/**
 * Every screen talks to the knee sleeve through SleeveSource, so the real
 * sleeve can plug in later without screen rewrites. Screens read
 * `capabilities` to decide what to show.
 *
 * Plain TypeScript with relative `.ts` imports, like lib/progress, so the
 * seed script can use FakeSource from Node.
 */

export type SourceKind = 'fake' | 'manual' | 'sleeve';

export type Capabilities = {
  repCounting: boolean;
  formScore: boolean;
  liveSignals: boolean;
  dailyActivity: boolean;
  fallDetection: boolean;
  heartRate: boolean;
};

export type ConnectionState = 'none' | 'connecting' | 'connected';
export type Knee = 'left' | 'right' | 'both';
export type CalibrationStatus = 'not_started' | 'in_progress' | 'done';

export type Unsubscribe = () => void;

/** A value that changes over time. `subscribe` calls back with every new value. */
export type Observable<T> = {
  get(): T;
  subscribe(listener: (value: T) => void): Unsubscribe;
};

export type DeviceInfo = {
  id: string;
  firmware: string;
  knee: Knee;
  /** 0 to 100. */
  batteryPct: number;
  worn: boolean;
  /** ISO timestamp. */
  lastSyncAt: string | null;
  calibration: CalibrationStatus;
};

export type LiveSignal = {
  /** ISO timestamp. */
  at: string;
  /** Knee bend in degrees, 0 is straight. */
  kneeAngleDeg: number;
  heartRateBpm: number | null;
};

/** One day of all-day data. Matches a `daily_activity` row. */
export type DailyActivity = {
  /** 'YYYY-MM-DD' in Singapore. */
  localDate: string;
  steps: number;
  walkingMinutes: number;
  activeMinutes: number;
  sedentaryMinutes: number;
  sitToStandCount: number;
};

export type FallEvent = {
  /** ISO timestamp. */
  detectedAt: string;
  details: Record<string, unknown>;
};

export type RepEvent = { type: 'rep'; count: number };
export type FormScoreEvent = { type: 'formScore'; score: number };
export type TrackerEvent = RepEvent | FormScoreEvent;

/** What the sleeve measured during one exercise. Empty for manual logging. */
export type ExerciseMeasurement = {
  repsDone?: number;
  /** 0 to 10. */
  formScore?: number;
  sensorSummary?: Record<string, unknown>;
};

export type ExerciseTracker = {
  /** The latest rep or form score event, null before the first. */
  events: Observable<TrackerEvent | null>;
  pause(): void;
  resume(): void;
  finish(): ExerciseMeasurement;
};

export type SleeveSource = {
  kind: SourceKind;
  capabilities: Capabilities;
  connection: Observable<ConnectionState>;
  device(): DeviceInfo | null;
  startExercise(exercise: { exerciseId: string; repTarget: number }): ExerciseTracker;
  subscribeLiveSignals(listener: (signal: LiveSignal) => void): Unsubscribe;
  getDailyActivity(localDate: string): Promise<DailyActivity | null>;
  subscribeFallEvents(listener: (event: FallEvent) => void): Unsubscribe;
};

export const NO_CAPABILITIES: Capabilities = {
  repCounting: false,
  formScore: false,
  liveSignals: false,
  dailyActivity: false,
  fallDetection: false,
  heartRate: false,
};
