// Writes the summary of a completed visit: everything since the last
// completed visit (or since the programme began), computed with
// buildVisitSummary from lib/progress. It is stored in two parts so RLS can
// give a physio on Free the adherence part only.
//
// Only the senior's active physio may call it, for a visit that is
// completed. Body: { "visit_id": "..." }.

import {
  buildVisitSummary,
  localDate,
  sessionFromRow,
  visitPeriodEnd,
} from '../../../lib/progress/index.ts';
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

  const body = (await req.json().catch(() => ({}))) as { visit_id?: unknown };
  if (typeof body.visit_id !== 'string') return reply({ error: 'not_found' }, 400);

  try {
    const { data: visit, error } = await admin
      .from('visits')
      .select('id, senior_id, status, completed_at, period_start')
      .eq('id', body.visit_id)
      .maybeSingle();
    if (error) throw error;
    if (!visit) return reply({ error: 'not_found' }, 404);

    const { count, error: linkError } = await admin
      .from('care_links')
      .select('id', { count: 'exact', head: true })
      .eq('senior_id', visit.senior_id)
      .eq('member_id', user.id)
      .eq('role', 'physio')
      .eq('status', 'active');
    if (linkError) throw linkError;
    if (!count) return reply({ error: 'not_allowed' }, 403);
    if (visit.status !== 'completed' || !visit.completed_at || !visit.period_start) {
      return reply({ error: 'not_completed' }, 409);
    }

    const programme = await loadProgramme(admin, visit.senior_id);
    if (!programme) return reply({ error: 'not_found' }, 404);
    const periodStart = visit.period_start as string;
    const periodEnd = visitPeriodEnd(periodStart, visit.completed_at as string);
    const [sessions, notes] = await Promise.all([
      loadSessions(admin, visit.senior_id, periodStart, periodEnd, true),
      admin
        .from('caregiver_notes')
        .select('id, created_at')
        .eq('senior_id', visit.senior_id)
        .gte('created_at', new Date(`${periodStart}T00:00:00+08:00`).toISOString()),
    ]);
    if (notes.error) throw notes.error;

    const summary = buildVisitSummary({
      programme,
      sessions: sessions.map(sessionFromRow),
      notes: notes.data.map((n) => ({
        id: n.id as string,
        localDate: localDate(n.created_at as string),
      })),
      periodStart,
      periodEnd,
    });
    const generatedAt = new Date().toISOString();
    const { error: writeError } = await admin.from('visit_summaries').upsert([
      {
        visit_id: visit.id,
        part: 'adherence',
        body: summary.adherence,
        includes_sample_data: summary.includesSampleData,
        generated_at: generatedAt,
      },
      {
        visit_id: visit.id,
        part: 'details',
        body: summary.details,
        includes_sample_data: summary.includesSampleData,
        generated_at: generatedAt,
      },
    ]);
    if (writeError) throw writeError;
    return reply({ summary });
  } catch (error) {
    console.error(error);
    return reply({ error: 'generic' }, 500);
  }
});
