import { router } from 'expo-router';

import { useUserId } from '@/lib/auth/useAuth';
import { localDate, prescribedSlots } from '@/lib/progress';
import { useExercises, useProgramme } from '@/lib/queries/programme';
import { useFinishSession, useTodaySessions } from '@/lib/queries/sessions';

import { currentStep, nextQueue, queueForSession, type Step } from './flow';

/**
 * Everything the session screens need: the programme, today's sessions, the
 * one in progress (if any), its queue and where the senior is in it.
 */
export function useSessionFlow() {
  const userId = useUserId();
  const programme = useProgramme(userId);
  const sessions = useTodaySessions();
  const exercises = useExercises();
  const today = localDate(new Date());

  const isPending = programme.isPending || sessions.isPending || exercises.isPending;
  const error = programme.error ?? sessions.error ?? exercises.error;
  if (!programme.data || !sessions.data || !exercises.data) {
    return { ready: false as const, isPending, error };
  }

  const all = sessions.data;
  const active = all.find((s) => s.status === 'in_progress') ?? null;
  const queue = active
    ? queueForSession(programme.data.programme, active, all)
    : nextQueue(programme.data.programme, today, all);
  const step: Step | null = active ? currentStep(queue, active.session_exercises) : null;
  const slots = prescribedSlots(programme.data.programme, today);
  const complete = all.filter((s) => s.status === 'complete').length;

  return {
    ready: true as const,
    isPending,
    /** Refetching after a change: wait before redirecting on what the data shows. */
    isFetching: sessions.isFetching,
    error,
    exercises: exercises.data,
    sessions: all,
    active,
    queue,
    step,
    slots,
    /** A new session now would be beyond what the plan prescribes, so it wouldn't count. */
    isExtra: !active && slots > 0 && complete >= slots,
  };
}

export function goToDone(sessionId: string) {
  router.replace({ pathname: '/session/done', params: { id: sessionId } });
}

/**
 * The screen for a step. A session whose every exercise is done and answered
 * (its last save was interrupted) is saved as complete first.
 */
export function useGoToStep() {
  const finish = useFinishSession();
  const go = async (sessionId: string, step: Step) => {
    if (step.kind === 'exercise') return router.replace('/session/exercise');
    if (step.kind === 'questions') return router.replace('/session/questions');
    await finish.mutateAsync({ sessionId, status: 'complete' });
    goToDone(sessionId);
  };
  return { go, finishing: finish.isPending, error: finish.error };
}

/** Runs a save, then moves on. A failed save stays on screen as the mutation's error. */
export function thenGo(save: Promise<unknown>, next: () => void) {
  save.then(next, () => {});
}
