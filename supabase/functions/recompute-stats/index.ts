// Recomputes the caller's senior_stats row from their programme and
// sessions, with the progress rules in lib/progress (the only
// implementation). The app calls it after every session, and when Today
// opens with stats from an earlier day.
//
// The caller is the senior: the function reads their records with the
// service role (Supabase injects the key; it is never in the repo or the
// app) and writes only their own row.

import { computeStats, localDate, sessionFromRow, statsRow } from '../../../lib/progress/index.ts';
import {
  adminClient,
  caller,
  CORS,
  loadProgramme,
  loadSessions,
  reply,
} from '../_shared/progress.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);

  const admin = adminClient();
  const user = await caller(admin, req);
  if (!user) return reply({ error: 'not_signed_in' }, 401);

  try {
    const programme = await loadProgramme(admin, user.id);
    if (!programme) return reply({ error: 'not_a_senior' }, 403);
    const sessions = await loadSessions(admin, user.id, programme.startDate, null);
    const stats = computeStats(programme, sessions.map(sessionFromRow), localDate(new Date()));

    const row = { ...statsRow(user.id, stats), updated_at: new Date().toISOString() };
    const { error } = await admin.from('senior_stats').upsert(row);
    if (error) throw error;
    return reply({ stats: row });
  } catch (error) {
    console.error(error);
    return reply({ error: 'generic' }, 500);
  }
});
