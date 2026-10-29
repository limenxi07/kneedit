import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import type { Language } from '@/lib/i18n/languages';
import { supabase } from '@/lib/supabase/client';

/**
 * Where magic links and Google send the user back to: kneedit://auth/callback
 * in a build, exp://.../--/auth/callback in Expo Go, <origin>/auth/callback
 * on the web. Each must be allowed in Supabase (supabase/config.toml).
 */
export function callbackUrl(): string {
  return Linking.createURL('/auth/callback');
}

/** Email a magic link that also carries a 6-digit code. */
export async function sendSignInCode(
  email: string,
  language: Language,
  options: { createUser?: boolean } = {},
): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: callbackUrl(),
      shouldCreateUser: options.createUser ?? true,
      data: { locale: language },
    },
  });
  if (error) throw error;
}

export async function verifySignInCode(email: string, code: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: code.replace(/\s/g, ''),
    type: 'email',
  });
  if (error) throw error;
}

/**
 * Google sign-in. On the web the page navigates to Google and comes back to
 * /auth/callback. On native it opens an auth session in the browser and
 * finishes here. Returns false if the user closed the browser.
 */
export async function signInWithGoogle(): Promise<boolean> {
  const redirectTo = callbackUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
  });
  if (error) throw error;
  if (Platform.OS === 'web') return true;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false;
  await completeSignIn(Linking.parse(result.url).queryParams ?? {});
  return true;
}

type CallbackParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Finish a sign-in from the parameters on /auth/callback: a PKCE `code`
 * (magic link opened on this device, or Google), or a `token_hash` (an email
 * template that links straight to the app).
 */
export async function completeSignIn(params: CallbackParams): Promise<void> {
  const errorDescription = first(params.error_description) ?? first(params.error);
  if (errorDescription)
    throw Object.assign(new Error(errorDescription), { code: first(params.error_code) });

  const code = first(params.code);
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  const tokenHash = first(params.token_hash);
  if (tokenHash) {
    const type = first(params.type) === 'signup' ? 'signup' : 'magiclink';
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) throw error;
    return;
  }

  // Already signed in (the link was opened twice): nothing to do.
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('missing_code');
}
