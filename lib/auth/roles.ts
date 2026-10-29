/**
 * Which parts of the app an account can use. A role comes from what the
 * account has, never from a setting (PLAN.md, Roles):
 * - senior: the account has a `seniors` row;
 * - caregiver or physio: an open (pending or active) link of that role, or
 *   the role the account chose at onboarding, so a new caregiver or physio
 *   with no links yet still gets their home screen.
 *
 * This only decides navigation. What anyone can read is enforced by RLS.
 */
export const ROLES = ['senior', 'caregiver', 'physio'] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

type LinkLike = { role: 'caregiver' | 'physio'; status: 'pending' | 'active' | 'revoked' };

export function availableRoles(input: {
  isSenior: boolean;
  links: readonly LinkLike[];
  defaultContext: Role | null;
}): Role[] {
  const has = (role: 'caregiver' | 'physio') =>
    input.defaultContext === role ||
    input.links.some((l) => l.role === role && l.status !== 'revoked');
  return ROLES.filter((role) => (role === 'senior' ? input.isSenior : has(role)));
}

/**
 * The role to open: the one picked on this device if it is still available,
 * else the one chosen at onboarding, else the first available. Null means
 * the account hasn't finished onboarding.
 */
export function pickRole(
  available: readonly Role[],
  preferred: Role | null,
  defaultContext: Role | null,
): Role | null {
  if (preferred && available.includes(preferred)) return preferred;
  if (defaultContext && available.includes(defaultContext)) return defaultContext;
  return available[0] ?? null;
}

/** First screen for each role. */
export const HOME = {
  senior: '/today',
  caregiver: '/overview',
  physio: '/patients',
} as const satisfies Record<Role, string>;
