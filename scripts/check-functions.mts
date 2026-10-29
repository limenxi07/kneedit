/**
 * Calls the Edge Functions on the local Supabase as a real user, end to end.
 * CI runs it after the pgTAP tests; run it yourself after `npm run db:start`:
 *
 *   npm run functions:check
 *
 * It creates two throwaway accounts on the local database, checks what the
 * functions return and write, then deletes the accounts.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

import { createClient, FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';

import { localDate } from '../lib/progress/index.ts';
import type { Database } from '../lib/supabase/database.types.ts';

const status = JSON.parse(
  execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
) as { API_URL: string; ANON_KEY: string; SERVICE_ROLE_KEY: string };

const admin = createClient<Database>(status.API_URL, status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const created: string[] = [];

async function signedInUser(label: string): Promise<SupabaseClient<Database>> {
  const email = `check-${label}-${Date.now()}@kneedit.test`;
  const password = `check-${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  created.push(data.user.id);
  const client = createClient<Database>(status.API_URL, status.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return client;
}

/** The first call can wait for the function to boot, so retry server errors a few times. */
async function invoke<T = Record<string, Record<string, unknown>>>(
  client: SupabaseClient<Database>,
  name: string,
  body?: Record<string, unknown>,
) {
  for (let attempt = 1; ; attempt++) {
    const result = await client.functions.invoke<T>(name, { method: 'POST', body });
    const code = result.error instanceof FunctionsHttpError ? result.error.context.status : 0;
    if (!result.error || (code >= 400 && code < 500) || attempt === 5) return { ...result, code };
    console.log(`${name}: attempt ${attempt} failed (${code || result.error.message}), retrying`);
    await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
  }
}

try {
  const senior = await signedInUser('senior');
  const { data: user } = await senior.auth.getUser();
  const seniorId = user.user!.id;

  // A senior who finished one session today, exactly as the app does it.
  let r: { error: unknown } = await senior
    .from('seniors')
    .insert({ profile_id: seniorId, birth_year: 1950, gender: 'female' });
  assert.equal(r.error, null);
  const session = await senior.from('sessions').insert({ senior_id: seniorId }).select().single();
  assert.equal(session.error, null);
  r = await senior.from('session_exercises').insert({
    session_id: session.data!.id,
    exercise_id: 'seated-knee-extension',
    position: 1,
    reps_target: 10,
    hurt: false,
    easy: true,
  });
  assert.equal(r.error, null);
  r = await senior.from('sessions').update({ status: 'complete' }).eq('id', session.data!.id);
  assert.equal(r.error, null);

  const result = await invoke<{ stats: Record<string, unknown> }>(senior, 'recompute-stats');
  assert.equal(result.error, null, `recompute-stats failed: ${String(result.error)}`);
  const stats = result.data!.stats;
  assert.equal(stats.senior_id, seniorId);
  assert.equal(stats.as_of_date, localDate(new Date()));
  assert.equal(stats.week_done, 1);
  assert.equal(stats.streak, 1);
  assert.equal(stats.month_sessions, 1);
  assert.equal(stats.includes_sample_data, false);

  const stored = await senior.from('senior_stats').select('*').eq('senior_id', seniorId).single();
  assert.equal(stored.error, null);
  assert.equal(stored.data!.week_done, 1);
  assert.equal(stored.data!.streak, 1);
  console.log('recompute-stats: a senior gets their stats recomputed and stored');

  const member = await signedInUser('member');
  const refused = await invoke(member, 'recompute-stats');
  assert.equal(refused.code, 403);
  console.log('recompute-stats: an account without a senior record is refused');

  // The senior's physio records today's visit, as the dashboard does.
  const physio = await signedInUser('physio');
  const { data: physioUser } = await physio.auth.getUser();
  r = await admin.from('care_links').insert({
    senior_id: seniorId,
    member_id: physioUser.user!.id,
    role: 'physio',
    status: 'active',
  });
  assert.equal(r.error, null);
  const scheduled = await physio
    .from('visits')
    .insert({ senior_id: seniorId, scheduled_at: new Date().toISOString() })
    .select('id')
    .single();
  assert.equal(scheduled.error, null);
  const notYet = await invoke(physio, 'generate-visit-summary', { visit_id: scheduled.data!.id });
  assert.equal(notYet.code, 409);
  console.log('generate-visit-summary: a visit that is not done yet has no summary');

  r = await physio.from('visits').update({ status: 'completed' }).eq('id', scheduled.data!.id);
  assert.equal(r.error, null);
  const strangerTry = await invoke(member, 'generate-visit-summary', {
    visit_id: scheduled.data!.id,
  });
  assert.equal(strangerTry.code, 403);
  console.log("generate-visit-summary: only the senior's physio may generate it");

  const generated = await invoke<{
    summary: { adherence: { counted: number; prescribed: number }; details: unknown };
  }>(physio, 'generate-visit-summary', { visit_id: scheduled.data!.id });
  assert.equal(generated.error, null, `generate-visit-summary failed: ${String(generated.error)}`);
  assert.equal(generated.data!.summary.adherence.counted, 1);
  assert.equal(generated.data!.summary.adherence.prescribed, 1);
  const parts = await physio
    .from('visit_summaries')
    .select('part, body')
    .eq('visit_id', scheduled.data!.id)
    .order('part');
  assert.equal(parts.error, null);
  assert.deepEqual(
    parts.data!.map((p) => p.part),
    ['adherence', 'details'],
  );
  const details = parts.data![1]!.body as { hurt: { yes: number; answered: number } };
  assert.deepEqual(details.hurt, { yes: 0, answered: 1 });
  console.log('generate-visit-summary: the summary is stored in both parts');

  const anonymous = createClient<Database>(status.API_URL, status.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signedOut = await invoke(anonymous, 'recompute-stats');
  assert.equal(signedOut.code, 401);
  console.log('recompute-stats: a signed-out caller is refused');
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id);
}
