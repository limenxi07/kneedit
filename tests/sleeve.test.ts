import {
  createBleSource,
  createFakeSource,
  createManualSource,
  createRandom,
  fakeDailyActivity,
  type LiveSignal,
  type TrackerEvent,
} from '@/lib/sleeve';

describe('ManualSource', () => {
  const source = createManualSource();

  it('measures nothing, so screens show "needs the sleeve"', async () => {
    expect(source.kind).toBe('manual');
    expect(Object.values(source.capabilities).every((c) => c === false)).toBe(true);
    expect(source.connection.get()).toBe('none');
    expect(source.device()).toBeNull();
    expect(await source.getDailyActivity('2026-10-29')).toBeNull();
  });

  it('finishes an exercise with no reps and no score', () => {
    const tracker = source.startExercise({ exerciseId: 'quad-sets', repTarget: 10 });
    tracker.pause();
    tracker.resume();
    expect(tracker.events.get()).toBeNull();
    expect(tracker.finish()).toEqual({});
  });
});

describe('FakeSource', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('can do everything the sleeve will', () => {
    const source = createFakeSource();
    expect(source.kind).toBe('fake');
    expect(Object.values(source.capabilities).every(Boolean)).toBe(true);
    expect(source.connection.get()).toBe('connected');
    expect(source.device()?.knee).toBe('left');
  });

  it('counts reps up to the target, pauses, and scores form at the end', () => {
    const source = createFakeSource({ repIntervalMs: 1000 });
    const tracker = source.startExercise({ exerciseId: 'quad-sets', repTarget: 5 });
    const seen: TrackerEvent[] = [];
    tracker.events.subscribe((e) => e && seen.push(e));

    jest.advanceTimersByTime(3000);
    tracker.pause();
    jest.advanceTimersByTime(5000);
    expect(seen).toHaveLength(3);
    tracker.resume();
    jest.advanceTimersByTime(10000);

    const result = tracker.finish();
    expect(result.repsDone).toBe(5);
    expect(result.formScore).toBeGreaterThanOrEqual(6);
    expect(result.formScore).toBeLessThanOrEqual(9.5);
    expect(result.sensorSummary).toHaveProperty('maxKneeFlexionDeg');
    expect(seen.at(-1)).toEqual({ type: 'formScore', score: result.formScore });
  });

  it('streams knee angle and heart rate until unsubscribed', () => {
    const source = createFakeSource({ signalIntervalMs: 100 });
    const signals: LiveSignal[] = [];
    const stop = source.subscribeLiveSignals((s) => signals.push(s));
    jest.advanceTimersByTime(1000);
    stop();
    jest.advanceTimersByTime(1000);
    expect(signals).toHaveLength(10);
    for (const s of signals) {
      expect(s.kneeAngleDeg).toBeGreaterThanOrEqual(0);
      expect(s.kneeAngleDeg).toBeLessThanOrEqual(90);
      expect(s.heartRateBpm).toBeGreaterThan(60);
    }
  });

  it('gives the same daily activity for the same seed and date', async () => {
    const source = createFakeSource({ seed: 'demo' });
    expect(await source.getDailyActivity('2026-10-29')).toEqual(
      fakeDailyActivity('demo', '2026-10-29'),
    );
    expect(fakeDailyActivity('demo', '2026-10-29')).not.toEqual(
      fakeDailyActivity('demo', '2026-10-30'),
    );
    const day = fakeDailyActivity('demo', '2026-10-29');
    expect(day.activeMinutes).toBeGreaterThan(day.walkingMinutes);
  });

  it('reports a simulated possible fall to subscribers', () => {
    const source = createFakeSource();
    const listener = jest.fn();
    const stop = source.subscribeFallEvents(listener);
    source.simulateFall();
    stop();
    source.simulateFall();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('random', () => {
  it('repeats for the same seed', () => {
    const a = createRandom('x');
    const b = createRandom('x');
    expect([a.next(), a.int(1, 6), a.chance(0.5)]).toEqual([b.next(), b.int(1, 6), b.chance(0.5)]);
  });
});

describe('BleSource', () => {
  it('is not built yet', () => {
    expect(() => createBleSource()).toThrow(/not implemented/);
  });
});
