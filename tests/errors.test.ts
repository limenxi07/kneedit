import fs from 'node:fs';
import path from 'node:path';

import en from '@/locales/en/common.json';
import { errorKey, isRpcError } from '@/lib/supabase/errors';

// Raised only by triggers and RPCs the screens never send bad input to.
const NOT_SHOWN = [
  'not_signed_in',
  'session_finished',
  'session_empty',
  'nudge_rate_limited',
  'fake_data_for_real_account',
  'start_in_past',
  'no_items',
  'weekday_mismatch',
];

describe('errorKey', () => {
  it('maps the short keys RPCs raise', () => {
    expect(errorKey({ message: 'invalid_code', code: 'P0001' })).toBe('invalidCode');
    expect(errorKey({ message: 'reauth_required', code: 'P0001' })).toBe('reauthRequired');
  });

  it('maps auth error codes', () => {
    expect(errorKey({ message: 'Token has expired or is invalid', code: 'otp_expired' })).toBe(
      'codeExpired',
    );
    expect(errorKey({ message: 'x', code: 'over_email_send_rate_limit' })).toBe('tooManyTries');
  });

  it('recognises a network failure', () => {
    expect(errorKey(new TypeError('Network request failed'))).toBe('network');
    expect(errorKey({ name: 'AuthRetryableFetchError', message: 'fetch failed' })).toBe('network');
  });

  it('falls back to the generic message', () => {
    expect(errorKey(new Error('boom'))).toBe('generic');
    expect(errorKey(null)).toBe('generic');
  });

  it('tells one RPC error from another', () => {
    expect(isRpcError({ message: 'reauth_required' }, 'reauth_required')).toBe(true);
    expect(isRpcError({ message: 'demo_account' }, 'reauth_required')).toBe(false);
  });

  it('has a translated message for every RPC error the database raises', () => {
    const sql = fs
      .readdirSync(path.join(__dirname, '../supabase/migrations'))
      .map((f) => fs.readFileSync(path.join(__dirname, '../supabase/migrations', f), 'utf8'))
      .join('\n');
    const raised = new Set([...sql.matchAll(/raise exception '([a-z_]+)'/g)].map((m) => m[1]!));
    const fromScreens = [...raised].filter((k) => !NOT_SHOWN.includes(k));
    for (const key of fromScreens) {
      const mapped = errorKey({ message: key });
      expect([key, mapped]).not.toEqual([key, 'generic']);
      expect(en.errors).toHaveProperty(mapped);
    }
  });
});
