import AsyncStorage from '@react-native-async-storage/async-storage';

import { isCompleteCode, normalizeCode } from './code';

/**
 * A link code from a scanned QR, kept while a signed-out visitor signs in
 * and sets up their account. It is stored on the device (localStorage on the
 * web), so it survives Google sign-in, which leaves the page and comes back.
 */
const KEY = 'kneedit.pendingLinkCode';

/** Forget a code nobody acted on, so it can't surprise someone days later. */
export const PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type Stored = { code: string; savedAt: number };

export function encodePending(code: string, now: number): string {
  return JSON.stringify({ code: normalizeCode(code), savedAt: now } satisfies Stored);
}

/** The code in a stored value, or null if it is missing, broken or too old. */
export function decodePending(raw: string | null, now: number): string | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Stored>;
    if (typeof value.code !== 'string' || typeof value.savedAt !== 'number') return null;
    const age = now - value.savedAt;
    if (age < 0 || age > PENDING_MAX_AGE_MS) return null;
    return isCompleteCode(value.code) ? normalizeCode(value.code) : null;
  } catch {
    return null;
  }
}

export async function savePendingLinkCode(code: string): Promise<void> {
  if (!isCompleteCode(code)) return;
  await AsyncStorage.setItem(KEY, encodePending(code, Date.now())).catch(() => undefined);
}

export async function readPendingLinkCode(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(KEY).catch(() => null);
  return decodePending(raw, Date.now());
}

export async function clearPendingLinkCode(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => undefined);
}
