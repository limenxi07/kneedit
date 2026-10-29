// Loading a senior's records for the progress rules, shared by the Edge
// Functions. Everything here runs with the service role, so each function
// checks who is calling before it uses these.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

import {
  programmeFromRows,
  type PrescriptionRow,
  type Programme,
  type RoutineItemRow,
  type SessionRow,
} from '../../../lib/progress/index.ts';

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** The signed-in caller, from the request's bearer token, or null. */
export async function caller(admin: SupabaseClient, req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const {
    data: { user },
  } = await admin.auth.getUser(token);
  return user;
}

/** A senior's programme, or null if the account isn't a senior. */
export async function loadProgramme(
  admin: SupabaseClient,
  seniorId: string,
): Promise<Programme | null> {
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
  return programmeFromRows({
    seniorCreatedAt: senior.data.created_at as string,
    defaultRoutine: routine.data as RoutineItemRow[],
    prescriptions: prescriptions.data as PrescriptionRow[],
  });
}

const PAGE = 1000;

/** A senior's sessions from one date to another (both included), a page at a time. */
export async function loadSessions(
  admin: SupabaseClient,
  seniorId: string,
  from: string,
  to: string | null,
  withExercises = false,
): Promise<SessionRow[]> {
  const columns = withExercises
    ? 'id, local_date, status, ended_at, source, session_exercises (exercise_id, hurt, easy, form_score)'
    : 'id, local_date, status, ended_at, source';
  const rows: SessionRow[] = [];
  for (let start = 0; ; start += PAGE) {
    let query = admin
      .from('sessions')
      .select(columns)
      .eq('senior_id', seniorId)
      .gte('local_date', from);
    if (to) query = query.lte('local_date', to);
    const { data, error } = await query
      .order('local_date')
      .order('id')
      .range(start, start + PAGE - 1);
    if (error) throw error;
    rows.push(...(data as unknown as SessionRow[]));
    if (data.length < PAGE) return rows;
  }
}
