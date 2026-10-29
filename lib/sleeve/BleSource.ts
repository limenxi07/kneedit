import type { SleeveSource } from './types.ts';

/**
 * The real sleeve over Bluetooth Low Energy. Not built yet: there is no
 * hardware. It needs a development build (EAS), since Expo Go has no BLE.
 *
 * TODO(sleeve), mapped to brief section 10:
 * - Reps and range of motion: count reps from knee angle, report peak flexion
 *   and extension per rep (ExerciseTracker rep events, sensorSummary).
 * - Tempo, hold and rest: time each phase, compare with the exercise's target.
 * - EMG: quadriceps activation for the form score (formScore events).
 * - PPG: heart rate (LiveSignal.heartRateBpm, capabilities.heartRate).
 * - All-day motion: steps, walking, active and sedentary minutes, sit-to-stand
 *   count (getDailyActivity, written to daily_activity with source 'sleeve').
 * - Fall pattern: possible fall detection (subscribeFallEvents, fall_events).
 * - Device info: firmware, battery, worn, last sync, calibration (device()).
 */
export function createBleSource(): SleeveSource {
  throw new Error('BleSource is not implemented yet: there is no sleeve hardware.');
}
