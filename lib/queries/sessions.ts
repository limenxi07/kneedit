import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/lib/auth/useAuth';
import { localDate, type PlanItem } from '@/lib/progress';
import type { ExerciseMeasurement } from '@/lib/sleeve';
import { supabase, type Tables } from '@/lib/supabase/client';

export type SessionExercise = Tables<'session_exercises'>;
export type SessionWithExercises = Tables<'sessions'> & { session_exercises: SessionExercise[] };

const SESSION_COLUMNS = '*, session_exercises (*)';

export const sessionKeys = {
  all: ['sessions'] as const,
  day: (userId: string, date: string) => ['sessions', userId, 'day', date] as const,
  one: (id: string) => ['sessions', 'one', id] as const,
};

/** Today's sessions for the signed-in senior, oldest first, with what was done in each. */
export function useTodaySessions() {
  const userId = useUserId();
  const today = localDate(new Date());
  return useQuery({
    queryKey: sessionKeys.day(userId, today),
    queryFn: async (): Promise<SessionWithExercises[]> => {
      const { data, error } = await supabase
        .from('sessions')
        .select(SESSION_COLUMNS)
        .eq('senior_id', userId)
        .eq('local_date', today)
        .order('started_at');
      if (error) throw error;
      return data;
    },
  });
}

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.one(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<SessionWithExercises> => {
      const { data, error } = await supabase
        .from('sessions')
        .select(SESSION_COLUMNS)
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Asks the server to recompute the senior's stats with lib/progress. Returns
 * null if that fails (offline, or the function isn't deployed): screens then
 * show the last stats they have.
 */
export async function recomputeStats(): Promise<Tables<'senior_stats'> | null> {
  const { data, error } = await supabase.functions.invoke<{ stats: Tables<'senior_stats'> }>(
    'recompute-stats',
    { method: 'POST' },
  );
  if (error || !data) {
    console.warn('recompute-stats failed', error);
    return null;
  }
  return data.stats;
}

/**
 * Refetches everything a session changes. Not awaited by the mutations, so a
 * screen can move on at once; the session screens wait for the refetch
 * before acting on what it shows.
 */
function useInvalidateSessions() {
  const client = useQueryClient();
  return () =>
    void Promise.all([
      client.invalidateQueries({ queryKey: sessionKeys.all }),
      client.invalidateQueries({ queryKey: ['my_stats'] }),
      client.invalidateQueries({ queryKey: ['leaderboard'] }),
      client.invalidateQueries({ queryKey: ['senior_stats'] }),
      client.invalidateQueries({ queryKey: ['last_form_score'] }),
    ]);
}

/**
 * Starts a session. The server fills in today's date, the programme version
 * in force, timestamps and source = 'manual'; the client can only say whose
 * session it is.
 */
export function useStartSession() {
  const userId = useUserId();
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .insert({ senior_id: userId })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: invalidate,
  });
}

/** The senior tapped Done on an exercise. The answers come next. */
export function useRecordExercise() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: async (input: {
      sessionId: string;
      item: PlanItem;
      measurement: ExerciseMeasurement;
    }) => {
      const { error } = await supabase.from('session_exercises').insert({
        session_id: input.sessionId,
        exercise_id: input.item.exerciseId,
        position: input.item.position,
        reps_target: input.item.reps,
        reps_done: input.measurement.repsDone ?? null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

type Ending = 'complete' | 'incomplete';

/**
 * Ends a session: complete once every exercise is done and answered,
 * incomplete when ended early. Then the stats are recomputed, so the done
 * screen shows the new week and leaderboard.
 */
async function finishSession(sessionId: string, status: Ending) {
  const { error } = await supabase.from('sessions').update({ status }).eq('id', sessionId);
  if (error) throw error;
  await recomputeStats();
}

/**
 * "Did it hurt?" and "Was it easy?" for one exercise, and, after the last
 * exercise or when ending early, the end of the session in the same step.
 */
export function useAnswerExercise() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: async (input: {
      sessionId: string;
      position: number;
      hurt: boolean | null;
      easy: boolean | null;
      thenEnd?: Ending;
    }) => {
      const { error } = await supabase
        .from('session_exercises')
        .update({ hurt: input.hurt, easy: input.easy })
        .eq('session_id', input.sessionId)
        .eq('position', input.position);
      if (error) throw error;
      if (input.thenEnd) await finishSession(input.sessionId, input.thenEnd);
    },
    onSuccess: invalidate,
  });
}

export function useFinishSession() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: (input: { sessionId: string; status: Ending }) =>
      finishSession(input.sessionId, input.status),
    onSuccess: invalidate,
  });
}
