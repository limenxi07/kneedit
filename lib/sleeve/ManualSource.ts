import { constant } from './observable.ts';
import { NO_CAPABILITIES, type ExerciseTracker, type SleeveSource } from './types.ts';

/**
 * No sleeve: the senior taps Done. Nothing is measured, so there is no rep
 * count and no form score ("Form score needs the sleeve"). Every session uses
 * this for now, demo accounts included.
 */
export function createManualSource(): SleeveSource {
  return {
    kind: 'manual',
    capabilities: NO_CAPABILITIES,
    connection: constant('none'),
    device: () => null,
    startExercise(): ExerciseTracker {
      return {
        events: constant(null),
        pause() {},
        resume() {},
        finish: () => ({}),
      };
    },
    subscribeLiveSignals: () => () => {},
    getDailyActivity: async () => null,
    subscribeFallEvents: () => () => {},
  };
}
