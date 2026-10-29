import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/lib/auth/useAuth';
import { localDate, sortLeaderboard, type LeaderboardEntry } from '@/lib/progress';
import { supabase, type Tables } from '@/lib/supabase/client';

import { namesFor } from './links';
import { meKey } from './me';
import { recomputeStats } from './sessions';

/**
 * The signed-in senior's own numbers from senior_stats. If the row is from
 * an earlier day (nobody has exercised since), it is recomputed first, so
 * the streak and week are always today's.
 */
export function useMyStats() {
  const userId = useUserId();
  const today = localDate(new Date());
  return useQuery({
    queryKey: ['my_stats', userId, today],
    queryFn: async (): Promise<Tables<'senior_stats'> | null> => {
      const { data, error } = await supabase
        .from('senior_stats')
        .select('*')
        .eq('senior_id', userId)
        .maybeSingle();
      if (error) throw error;
      if (data?.as_of_date === today) return data;
      return (await recomputeStats()) ?? data;
    },
  });
}

/** The friends' leaderboard, sorted by lib/progress (the RPC returns names, streaks and week % only). */
export function useLeaderboard() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['leaderboard', userId],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const { data, error } = await supabase.rpc('get_friend_leaderboard');
      if (error) throw error;
      return sortLeaderboard(
        data.map((r) => ({
          seniorId: r.senior_id,
          displayName: r.display_name,
          streak: r.streak,
          weekRate: r.week_rate,
          includesSampleData: r.includes_sample_data,
          isMe: r.is_me,
        })),
      );
    },
  });
}

/** The latest form score from the sleeve, or null if there is none ("needs the sleeve"). */
export function useLastFormScore() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['last_form_score', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_exercises')
        .select('form_score, source, completed_at, sessions!inner (senior_id)')
        .eq('sessions.senior_id', userId)
        .not('form_score', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data || data.form_score === null) return null;
      return { score: Number(data.form_score), isSample: data.source === 'fake' };
    },
  });
}

export type Nudge = Tables<'nudges'> & { senderName: string | null };

/** The latest nudge from family that the senior hasn't seen yet. */
export function useUnseenNudge() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['nudges', userId, 'unseen'],
    queryFn: async (): Promise<Nudge | null> => {
      const { data, error } = await supabase
        .from('nudges')
        .select('*')
        .eq('senior_id', userId)
        .is('seen_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const names = await namesFor(data.sender_id ? [data.sender_id] : []);
      return { ...data, senderName: data.sender_id ? (names.get(data.sender_id) ?? null) : null };
    },
  });
}

/** Marks every unseen nudge as seen. */
export function useMarkNudgesSeen() {
  const userId = useUserId();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('nudges')
        .update({ seen_at: new Date().toISOString() })
        .eq('senior_id', userId)
        .is('seen_at', null);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['nudges', userId] }),
  });
}

export type Visit = Tables<'visits'> & { physioName: string | null };

/** The senior's visits, booked and past, with the physio's name (null: a former physio). */
export function useMyVisits() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['visits', userId],
    queryFn: async (): Promise<Visit[]> => {
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('senior_id', userId)
        .neq('status', 'cancelled')
        .order('scheduled_at');
      if (error) throw error;
      const ids = [...new Set(data.flatMap((v) => (v.physio_id ? [v.physio_id] : [])))];
      const names = await namesFor(ids);
      return data.map((v) => ({
        ...v,
        physioName: v.physio_id ? (names.get(v.physio_id) ?? null) : null,
      }));
    },
  });
}

/** Booked visits still to come, soonest first, and every other visit, latest first. */
export function splitVisits(visits: readonly Visit[], now = new Date()) {
  const isUpcoming = (v: Visit) =>
    v.status === 'scheduled' && Date.parse(v.scheduled_at) >= now.getTime();
  return {
    upcoming: visits.filter(isUpcoming),
    past: visits.filter((v) => !isUpcoming(v)).reverse(),
  };
}

/** The next booked visit that hasn't started yet. */
export function nextVisit(visits: readonly Visit[], now = new Date()): Visit | null {
  return splitVisits(visits, now).upcoming[0] ?? null;
}

/** The daily reminder time, "HH:MM" in Singapore time. */
export function useUpdateReminderTime() {
  const userId = useUserId();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (time: string) => {
      const { error } = await supabase
        .from('seniors')
        .update({ reminder_time: time })
        .eq('profile_id', userId);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: meKey(userId) }),
  });
}
