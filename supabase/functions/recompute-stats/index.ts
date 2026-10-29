// Recomputes the caller's senior_stats row from their programme and
// sessions, with the progress rules in lib/progress (the only
// implementation). The app calls it after every session, and when Today
// opens with stats from an earlier day.
//
// The caller is the senior: the function reads their records with the
// service role (Supabase injects the key; it is never in the repo or the
// app) and writes only their own row.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

import {
  computeStats,
  localDate,
  programmeFromRows,
  sessionFromRow,
  statsRow,
  type PrescriptionRow,
  type RoutineItemRow,
  type SessionRow,
} from '../../../lib/progress/index.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

const PAGE = 1000;

/** Every session of a senior from a date on, a page at a time. */
async function sessionsSince(admin: SupabaseClient, seniorId: string, from: string) {
  const rows: SessionRow[] = [];
  for (let start = 0; ; start += PAGE) {
    const { data, error } = await admin
      .from('sessions')
      .select('id, local_date, status, ended_at, source')
      .eq('senior_id', seniorId)
      .gte('local_date', from)
      .order('local_date')
      .order('id')
      .range(start, start + PAGE - 1);
    if (error) throw error;
    rows.push(...(data as SessionRow[]));
    if (data.length < PAGE) return rows;
  }
}

async function recompute(admin: SupabaseClient, seniorId: string) {
  const [senior, routine, prescriptions] = await Promise.all([
    admin.from('seniors').select('created_at').eq('profile_id', seniorId).maybeSingle(),
    admin.from('default_routine_items').select('position, exercise_id, reps, frequency'),
    admin
      .from('prescriptions')
      .select(
        'id, start_date, created_at, variation, prescription_items (position, exercise_id, reps, frequency, weekday)',
      )
      .eq('senior_id', seniorId),
  ]);
  if (senior.error) throw senior.error;
  if (routine.error) throw routine.error;
  if (prescriptions.error) throw prescriptions.error;
  if (!senior.data) return null;

  const programme = programmeFromRows({
    seniorCreatedAt: senior.data.created_at as string,
    defaultRoutine: routine.data as RoutineItemRow[],
    prescriptions: prescriptions.data as PrescriptionRow[],
  });
  const sessions = await sessionsSince(admin, seniorId, programme.startDate);
  const stats = computeStats(programme, sessions.map(sessionFromRow), localDate(new Date()));

  const row = { ...statsRow(seniorId, stats), updated_at: new Date().toISOString() };
  const { error } = await admin.from('senior_stats').upsert(row);
  if (error) throw error;
  return row;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const {
    data: { user },
  } = await admin.auth.getUser(token);
  if (!user) return reply({ error: 'not_signed_in' }, 401);
  try {
    const stats = await recompute(admin, user.id);
    if (!stats) return reply({ error: 'not_a_senior' }, 403);
    return reply({ stats });
  } catch (error) {
    console.error(error);
    return reply({ error: 'generic' }, 500);
  }
});
