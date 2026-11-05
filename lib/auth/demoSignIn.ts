import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase/client';

/**
 * Sign this device in to the seeded demo caregiver, for the /demo link. The
 * demo-sign-in Edge Function returns a one-time token for the demo account
 * (never a real one), and verifying it starts this device's own session. On
 * failure it throws an error whose message is a key errorKey() understands
 * (no_demo, demo_off).
 */
export async function signInToDemo(role: 'caregiver'): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ token_hash?: string }>('demo-sign-in', {
    method: 'POST',
    body: { role },
  });
  if (error) {
    // errorKey() reads a TypeError about fetching as "no connection".
    if (error instanceof FunctionsFetchError) throw new TypeError('Network request failed');
    const body: unknown =
      error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
    const key =
      typeof body === 'object' && body !== null && 'error' in body ? body.error : undefined;
    throw new Error(typeof key === 'string' ? key : 'generic');
  }
  if (!data?.token_hash) throw new Error('generic');

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: data.token_hash,
    type: 'email',
  });
  if (verifyError) throw verifyError;
}
