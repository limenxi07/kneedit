// Signs a visitor in to the demo caregiver, so someone who scans the demo QR
// lands on the caregiver screens with the seeded sample data, without making
// an account or linking. Anyone may call it (verify_jwt = false), so it only
// ever hands out a session for an account marked as demo
// (app_metadata.is_demo, which only the service role can write). Demo
// accounts can't link with real ones, can't delete themselves, and
// `npm run seed:demo` resets everything they change.
//
// It returns a one-time token hash; the app exchanges it with
// supabase.auth.verifyOtp({ type: 'email', token_hash }). No email is sent.
//
// Turn it off (before a pilot, say) with the secret DEMO_SIGN_IN=off.

import { adminClient, CORS, reply } from '../_shared/progress.ts';

/** Which demo account each demo link opens. Only the caregiver for now. */
const ROLES = ['caregiver'] as const;
type DemoRole = (typeof ROLES)[number];

function isDemoRole(value: unknown): value is DemoRole {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);
  if (Deno.env.get('DEMO_SIGN_IN') === 'off') return reply({ error: 'demo_off' }, 403);

  const body = (await req.json().catch(() => ({}))) as { role?: unknown };
  const role = body.role ?? 'caregiver';
  if (!isDemoRole(role)) return reply({ error: 'not_allowed' }, 400);

  const admin = adminClient();
  try {
    // The seed script makes exactly one demo account for each role.
    const { data: profile, error } = await admin
      .from('profiles')
      .select('id')
      .eq('is_demo', true)
      .eq('default_context', role)
      .order('created_at')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!profile) return reply({ error: 'no_demo' }, 404);

    // Check the flag on the auth user too: it is the source of truth.
    const { data: found, error: userError } = await admin.auth.admin.getUserById(profile.id);
    if (userError) throw userError;
    const user = found.user;
    if (user?.app_metadata?.is_demo !== true || !user.email) {
      return reply({ error: 'no_demo' }, 404);
    }

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
    });
    if (linkError) throw linkError;
    return reply({ token_hash: link.properties.hashed_token });
  } catch (error) {
    console.error(error);
    return reply({ error: 'generic' }, 500);
  }
});
