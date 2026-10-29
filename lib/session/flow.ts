import {
  countedSessions,
  sessionQueue,
  type LocalDate,
  type PlanItem,
  type Programme,
  type SessionStatus,
} from '@/lib/progress';

/**
 * The session flow's rules, kept pure so they can be tested. The database is
 * the source of truth: the flow works out where the senior is from the
 * session row and its exercise rows, so it picks up where it left off after
 * the app closes.
 */

export type FlowSession = {
  id: string;
  local_date: LocalDate;
  started_at: string;
  ended_at: string | null;
  status: SessionStatus;
  /** Null means the starter routine. */
  prescription_id: string | null;
};

/** What the senior has done in a session so far: one row per exercise. */
export type DoneExercise = { position: number; hurt: boolean | null; easy: boolean | null };

/**
 * What a session numbered `n` that day queues: the first has everything due,
 * the second only the twice-daily exercises. A session beyond what the plan
 * prescribes is an extra one: it repeats the day's exercises, and is saved
 * but not counted.
 */
export function queueForNumber(programme: Programme, date: LocalDate, n: number): PlanItem[] {
  const queue = sessionQueue(programme, date, n);
  return queue.length > 0 || n === 1 ? queue : sessionQueue(programme, date, 1);
}

/** Which session of its day this is: 1 plus the complete sessions that ended before it began. */
export function sessionNumber(session: FlowSession, sameDay: readonly FlowSession[]): number {
  const before = sameDay.filter(
    (s) =>
      s.id !== session.id &&
      s.status === 'complete' &&
      s.ended_at !== null &&
      s.ended_at <= session.started_at,
  );
  return before.length + 1;
}

/**
 * The queue a session keeps from start to end. It uses the programme version
 * the session started on, so a physio's change applies from the next session.
 */
export function queueForSession(
  programme: Programme,
  session: FlowSession,
  sameDay: readonly FlowSession[],
): PlanItem[] {
  const pinned: Programme = {
    ...programme,
    prescriptions: programme.prescriptions.filter((p) => p.id === session.prescription_id),
  };
  return queueForNumber(pinned, session.local_date, sessionNumber(session, sameDay));
}

/** The queue a new session started now would get. */
export function nextQueue(
  programme: Programme,
  today: LocalDate,
  todaySessions: readonly FlowSession[],
): PlanItem[] {
  const complete = todaySessions.filter((s) => s.status === 'complete').length;
  return queueForNumber(programme, today, complete + 1);
}

export type Step =
  | { kind: 'exercise'; index: number; item: PlanItem }
  | { kind: 'questions'; index: number; item: PlanItem }
  | { kind: 'finished' };

/**
 * Where the senior is: the first exercise not yet done, or the two questions
 * for an exercise done but not yet answered. Finished once every exercise in
 * the queue is done and answered.
 */
export function currentStep(queue: readonly PlanItem[], done: readonly DoneExercise[]): Step {
  for (const [index, item] of queue.entries()) {
    const record = done.find((d) => d.position === item.position);
    if (!record) return { kind: 'exercise', index, item };
    if (record.hurt === null || record.easy === null) return { kind: 'questions', index, item };
  }
  return { kind: 'finished' };
}

/** Whether a finished session counts towards the day (PLAN.md, Counted sessions). */
export function isCounted(
  session: FlowSession,
  sameDay: readonly FlowSession[],
  slots: number,
): boolean {
  const records = sameDay.map((s) => ({
    id: s.id,
    localDate: s.local_date,
    status: s.status,
    endedAt: s.ended_at,
    source: 'manual' as const,
  }));
  return countedSessions(records, slots).some((s) => s.id === session.id);
}
