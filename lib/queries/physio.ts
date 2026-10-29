import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/lib/auth/useAuth';
import { startOfDay, weekRange } from '@/lib/calendar/dateTime';
import {
  buildVisitSummary,
  localDate,
  sessionFromRow,
  weekStart,
  type Frequency,
  type VisitAdherence,
  type VisitDetails,
} from '@/lib/progress';
import { supabase, type Tables } from '@/lib/supabase/client';

import { namesFor } from './links';
import { useProgramme } from './programme';

/**
 * What the physio dashboard reads and writes. RLS decides what a physio
 * sees: on Free, no answers or scores, and only the adherence part of visit
 * summaries.
 */

export type PatientRow = {
  seniorId: string;
  name: string;
  stats: Tables<'senior_stats'> | null;
  /** "Did it hurt? Yes" answers this week. Always 0 for a physio on Free, who can't see answers. */
  painThisWeek: number;
};

/** The physio's active patients, with this week's numbers and pain reports. */
export function usePatients() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['patients', userId],
    queryFn: async (): Promise<PatientRow[]> => {
      const { data: links, error } = await supabase
        .from('care_links')
        .select('senior_id')
        .eq('member_id', userId)
        .eq('role', 'physio')
        .eq('status', 'active');
      if (error) throw error;
      const ids = links.map((l) => l.senior_id);
      if (ids.length === 0) return [];
      const monday = weekStart(localDate(new Date()));
      const [names, stats, pain] = await Promise.all([
        namesFor(ids),
        supabase.from('senior_stats').select('*').in('senior_id', ids),
        supabase
          .from('session_exercises')
          .select('sessions!inner (senior_id, local_date)')
          .eq('hurt', true)
          .in('sessions.senior_id', ids)
          .gte('sessions.local_date', monday),
      ]);
      if (stats.error) throw stats.error;
      if (pain.error) throw pain.error;
      return ids
        .map((id) => ({
          seniorId: id,
          name: names.get(id) ?? '',
          stats: stats.data.find((s) => s.senior_id === id) ?? null,
          painThisWeek: pain.data.filter((p) => p.sessions.senior_id === id).length,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

export type Patient = Tables<'seniors'> & {
  name: string;
  clinical: Tables<'senior_clinical'> | null;
};

export function usePatient(seniorId: string) {
  return useQuery({
    queryKey: ['patient', seniorId],
    queryFn: async (): Promise<Patient> => {
      const [senior, profile, clinical] = await Promise.all([
        supabase.from('seniors').select('*').eq('profile_id', seniorId).single(),
        supabase.from('profiles').select('display_name').eq('id', seniorId).single(),
        supabase.from('senior_clinical').select('*').eq('senior_id', seniorId).maybeSingle(),
      ]);
      if (senior.error) throw senior.error;
      if (profile.error) throw profile.error;
      if (clinical.error) throw clinical.error;
      return { ...senior.data, name: profile.data.display_name, clinical: clinical.data };
    },
  });
}

export function useSaveClinical(seniorId: string) {
  const client = useQueryClient();
  return useMutation({
    // Insert the first time, then update: physios may only update the
    // details themselves, so an upsert (which also writes senior_id) is refused.
    mutationFn: async (input: {
      exists: boolean;
      affectedKnee: Tables<'senior_clinical'>['affected_knee'];
      notes: string;
    }) => {
      const change = { affected_knee: input.affectedKnee, notes: input.notes };
      const { error } = input.exists
        ? await supabase.from('senior_clinical').update(change).eq('senior_id', seniorId)
        : await supabase.from('senior_clinical').insert({ senior_id: seniorId, ...change });
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['patient', seniorId] }),
  });
}

export type PhysioVisit = Tables<'visits'> & {
  adherence: VisitAdherence | null;
  details: VisitDetails | null;
  includesSampleData: boolean;
};

/** A patient's visits, latest first, with their stored summaries. */
export function usePatientVisits(seniorId: string) {
  return useQuery({
    queryKey: ['patient_visits', seniorId],
    queryFn: async (): Promise<PhysioVisit[]> => {
      const { data: visits, error } = await supabase
        .from('visits')
        .select('*')
        .eq('senior_id', seniorId)
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      const done = visits.filter((v) => v.status === 'completed').map((v) => v.id);
      const summaries = done.length
        ? await supabase.from('visit_summaries').select('*').in('visit_id', done)
        : { data: [], error: null };
      if (summaries.error) throw summaries.error;
      return visits.map((v) => {
        const parts = summaries.data.filter((s) => s.visit_id === v.id);
        const part = (name: 'adherence' | 'details') =>
          parts.find((p) => p.part === name)?.body ?? null;
        return {
          ...v,
          adherence: part('adherence') as VisitAdherence | null,
          details: part('details') as VisitDetails | null,
          includesSampleData: parts.some((p) => p.includes_sample_data),
        };
      });
    },
  });
}

/**
 * The summary so far: everything since the last completed visit (or since
 * the programme began), worked out live with lib/progress.
 */
export function useLiveSummary(seniorId: string, lastVisitDate: string | null) {
  const programme = useProgramme(seniorId);
  const today = localDate(new Date());
  const from = lastVisitDate ?? programme.data?.programme.startDate;
  const records = useQuery({
    queryKey: ['live_summary', seniorId, from],
    enabled: !!from,
    queryFn: async () => {
      const [sessions, notes] = await Promise.all([
        supabase
          .from('sessions')
          .select(
            'id, local_date, status, ended_at, source, session_exercises (exercise_id, hurt, easy, form_score)',
          )
          .eq('senior_id', seniorId)
          .gte('local_date', from!),
        supabase
          .from('caregiver_notes')
          .select('id, created_at')
          .eq('senior_id', seniorId)
          .gte('created_at', startOfDay(from!).toISOString()),
      ]);
      if (sessions.error) throw sessions.error;
      if (notes.error) throw notes.error;
      return { sessions: sessions.data, notes: notes.data };
    },
  });
  const summary =
    programme.data && records.data && from
      ? buildVisitSummary({
          programme: programme.data.programme,
          sessions: records.data.sessions.map(sessionFromRow),
          notes: records.data.notes.map((n) => ({ id: n.id, localDate: localDate(n.created_at) })),
          periodStart: from,
          periodEnd: today,
        })
      : undefined;
  return {
    summary,
    isPending: programme.isPending || records.isPending,
    error: programme.error ?? records.error,
  };
}

/** Asks the server to write a completed visit's summary. */
async function generateSummary(visitId: string) {
  const { error } = await supabase.functions.invoke('generate-visit-summary', {
    method: 'POST',
    body: { visit_id: visitId },
  });
  if (error) throw error;
}

function useInvalidateVisits(seniorId: string) {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['patient_visits', seniorId] }),
      client.invalidateQueries({ queryKey: ['visits', seniorId] }),
      client.invalidateQueries({ queryKey: ['agenda'] }),
      client.invalidateQueries({ queryKey: ['live_summary', seniorId] }),
    ]);
}

/** Books a visit. It shows in the senior's and the family's calendar. */
export function useScheduleVisit(seniorId: string) {
  const invalidate = useInvalidateVisits(seniorId);
  return useMutation({
    mutationFn: async (input: { at: Date; durationMin: number; location: string }) => {
      const { error } = await supabase.from('visits').insert({
        senior_id: seniorId,
        scheduled_at: input.at.toISOString(),
        duration_min: input.durationMin,
        location: input.location.trim(),
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/**
 * Marks a booked visit as done, or records one that just happened, then
 * generates its summary.
 */
export function useCompleteVisit(seniorId: string) {
  const invalidate = useInvalidateVisits(seniorId);
  return useMutation({
    mutationFn: async (visitId: string | null) => {
      let id = visitId;
      if (id) {
        const { error } = await supabase
          .from('visits')
          .update({ status: 'completed' })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('visits')
          .insert({
            senior_id: seniorId,
            scheduled_at: new Date().toISOString(),
            status: 'completed',
          })
          .select('id')
          .single();
        if (error) throw error;
        id = data.id;
      }
      await generateSummary(id);
    },
    onSettled: invalidate,
  });
}

/** Writes a completed visit's summary again, if it is missing. */
export function useGenerateSummary(seniorId: string) {
  const invalidate = useInvalidateVisits(seniorId);
  return useMutation({ mutationFn: generateSummary, onSettled: invalidate });
}

export function useCancelVisit(seniorId: string) {
  const invalidate = useInvalidateVisits(seniorId);
  return useMutation({
    mutationFn: async (visitId: string) => {
      const { error } = await supabase
        .from('visits')
        .update({ status: 'cancelled' })
        .eq('id', visitId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSavePrescription(seniorId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      startDate: string;
      variation: 'same_every_day' | 'by_weekday';
      items: { exercise_id: string; reps: number; frequency: Frequency; weekday?: number }[];
    }) => {
      const { error } = await supabase.rpc('save_prescription', {
        p_senior: seniorId,
        p_start_date: input.startDate,
        p_variation: input.variation,
        p_items: input.items,
      });
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['programme', seniorId] }),
  });
}

export type AgendaVisit = Tables<'visits'> & { patientName: string };

/** The physio's booked visits this week (Monday to Sunday), soonest first. */
export function useAgenda() {
  const userId = useUserId();
  const today = localDate(new Date());
  return useQuery({
    queryKey: ['agenda', userId, today],
    queryFn: async (): Promise<AgendaVisit[]> => {
      const { start, end } = weekRange(today);
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('physio_id', userId)
        .eq('status', 'scheduled')
        .gte('scheduled_at', start.toISOString())
        .lt('scheduled_at', end.toISOString())
        .order('scheduled_at');
      if (error) throw error;
      const names = await namesFor([...new Set(data.map((v) => v.senior_id))]);
      return data.map((v) => ({ ...v, patientName: names.get(v.senior_id) ?? '' }));
    },
  });
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('tags').select('*').order('key');
      if (error) throw error;
      return data;
    },
  });
}
