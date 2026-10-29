/**
 * Turn a Supabase error into the key of a translated message in
 * common:errors. RPCs raise short keys ('invalid_code'); auth errors carry a
 * `code`. Anything unknown gets the generic message.
 */
const RPC_ERRORS = {
  invalid_code: 'invalidCode',
  own_code: 'ownCode',
  not_found: 'notFound',
  not_allowed: 'notAllowed',
  not_a_senior: 'notASenior',
  demo_mixing: 'demoMixing',
  confirmation_mismatch: 'confirmationMismatch',
  demo_account: 'demoAccount',
  reauth_required: 'reauthRequired',
} as const;

const AUTH_ERRORS = {
  otp_expired: 'codeExpired',
  over_email_send_rate_limit: 'tooManyTries',
  over_request_rate_limit: 'tooManyTries',
  email_address_invalid: 'invalidEmail',
  validation_failed: 'invalidEmail',
  provider_disabled: 'providerUnavailable',
  user_not_found: 'noAccount',
  otp_disabled: 'noAccount',
} as const;

export type ErrorKey =
  | (typeof RPC_ERRORS)[keyof typeof RPC_ERRORS]
  | (typeof AUTH_ERRORS)[keyof typeof AUTH_ERRORS]
  | 'network'
  | 'generic';

function field(error: unknown, name: string): string | undefined {
  if (typeof error !== 'object' || error === null || !(name in error)) return undefined;
  const value = (error as Record<string, unknown>)[name];
  return typeof value === 'string' ? value : undefined;
}

export function errorKey(error: unknown): ErrorKey {
  const message = field(error, 'message');
  const code = field(error, 'code');
  if (message && message in RPC_ERRORS) return RPC_ERRORS[message as keyof typeof RPC_ERRORS];
  if (code && code in AUTH_ERRORS) return AUTH_ERRORS[code as keyof typeof AUTH_ERRORS];
  if (field(error, 'name') === 'AuthRetryableFetchError') return 'network';
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) return 'network';
  return 'generic';
}

/** Whether an RPC failed with this key, for flows that react to one error. */
export function isRpcError(error: unknown, key: keyof typeof RPC_ERRORS): boolean {
  return field(error, 'message') === key;
}
