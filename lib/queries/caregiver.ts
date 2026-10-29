import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/lib/auth/useAuth';
import { localDate } from '@/lib/progress';
import { supabase, type Tables } from '@/lib/supabase/client';

import { useAppSettings } from './account';
import { namesFor } from './links';

/**
 * What a caregiver reads about one senior. RLS decides what comes back:
 * these hooks only ask, and the screens explain an empty answer (the senior
 * turned a share off, or the paywall is on and the senior is on Free).
 */

export type SeniorSummary = Tables<'seniors'> & { name: string; isDemo: boolean };

export function useSeniorSummary(seniorId: string) {
  return useQuery({
    queryKey: ['senior', seniorId],
    queryFn: async (): Promise<SeniorSummary> => {
      const [senior, profile] = await Promise.all([
        supabase.from('seniors').select('*').eq('profile_id', seniorId).single(),
        supabase.from('profiles').select('display_name, is_demo').eq('id', seniorId).single(),
      ]);
      if (senior.error) throw senior.error;
      if (profile.error) throw profile.error;
      return { ...senior.data, name: profile.data.display_name, isDemo: profile.data.is_demo };
    },
  });
}

/**
 * Whether the senior's Plus features are open. While the paywall is off
 * (the default), everyone has them, labelled with a Plus badge. Mirrors
 * private.has_plus(); RLS is what actually enforces it.
 */
export function useHasPlus(senior: Pick<Tables<'seniors'>, 'plan'> | undefined): boolean {
  const settings = useAppSettings();
  if (!settings.data || !senior) return true;
  return !settings.data.paywall_enabled || senior.plan === 'plus';
}

export type Note = Tables<'caregiver_notes'> & { authorName: string | null };

/** Notes from family for the physio, newest first. Null author: a former caregiver. */
export function useCaregiverNotes(seniorId: string) {
  return useQuery({
    queryKey: ['caregiver_notes', seniorId],
    queryFn: async (): Promise<Note[]> => {
      const { data, error } = await supabase
        .from('caregiver_notes')
        .select('*')
        .eq('senior_id', seniorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const ids = [...new Set(data.flatMap((n) => (n.author_id ? [n.author_id] : [])))];
      const names = await namesFor(ids);
      return data.map((n) => ({
        ...n,
        authorName: n.author_id ? (names.get(n.author_id) ?? null) : null,
      }));
    },
  });
}

export function useAddNote(seniorId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase
        .from('caregiver_notes')
        .insert({ senior_id: seniorId, body: body.trim() });
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['caregiver_notes', seniorId] }),
  });
}

/** The start of today in Singapore, as an instant. */
function startOfTodayIso(): string {
  return new Date(`${localDate(new Date())}T00:00:00+08:00`).toISOString();
}

/** Whether this caregiver already nudged the senior today (one a day). */
export function useNudgedToday(seniorId: string) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['nudges', seniorId, 'sent_today', userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('nudges')
        .select('id', { count: 'exact', head: true })
        .eq('senior_id', seniorId)
        .eq('sender_id', userId)
        .gte('created_at', startOfTodayIso());
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  });
}

/** A gentle nudge: it shows on the senior's Today screen. */
export function useSendNudge(seniorId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('nudges').insert({ senior_id: seniorId });
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries({ queryKey: ['nudges', seniorId] }),
  });
}

/** Possible falls (if the senior shares them) and missed-days alerts, newest first. */
export function useAlerts(seniorId: string) {
  return useQuery({
    queryKey: ['alerts', seniorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('senior_id', seniorId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

/** Demo accounts only: pretend the sleeve noticed a possible fall. */
export function useSimulateFall(seniorId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('simulate_possible_fall', { p_senior: seniorId });
      if (error) throw error;
    },
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['alerts', seniorId] }),
        client.invalidateQueries({ queryKey: ['weekly_records', seniorId] }),
      ]),
  });
}

/**
 * The mock checkout. It only changes the plan while the paywall is on;
 * returns whether it did.
 */
export function useMockSetPlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { seniorId: string; plan: 'free' | 'plus' }) => {
      const { data, error } = await supabase.rpc('mock_set_plan', {
        p_senior: input.seniorId,
        p_plan: input.plan,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => client.invalidateQueries(),
  });
}
