import type { Frequency, LocalDate, Plan, Variation } from '@/lib/progress';

/**
 * The physio's programme editor, as pure functions on a draft so it can be
 * tested. Saving sends toRpcItems() to save_prescription(), which stores a
 * new version; history never changes.
 */

export type DraftItem = { exerciseId: string; reps: number; frequency: Frequency };

/** 'all' for a programme that is the same every day, '1' (Monday) to '7' (Sunday) otherwise. */
export type ListKey = 'all' | '1' | '2' | '3' | '4' | '5' | '6' | '7';
export const WEEKDAY_KEYS = ['1', '2', '3', '4', '5', '6', '7'] as const satisfies ListKey[];

export type Draft = {
  variation: Variation;
  startDate: LocalDate;
  lists: Record<ListKey, DraftItem[]>;
};

export const MIN_REPS = 1;
export const MAX_REPS = 100;

const emptyLists = (): Record<ListKey, DraftItem[]> => ({
  all: [],
  '1': [],
  '2': [],
  '3': [],
  '4': [],
  '5': [],
  '6': [],
  '7': [],
});

/** A draft that starts as a copy of the plan in force (or the starter routine), from `startDate`. */
export function draftFrom(plan: Plan | null, startDate: LocalDate): Draft {
  const lists = emptyLists();
  const variation = plan?.variation ?? 'same_every_day';
  for (const item of [...(plan?.items ?? [])].sort((a, b) => a.position - b.position)) {
    const key: ListKey =
      variation === 'by_weekday' && item.weekday ? (String(item.weekday) as ListKey) : 'all';
    lists[key].push({ exerciseId: item.exerciseId, reps: item.reps, frequency: item.frequency });
  }
  return { variation, startDate, lists };
}

function update(draft: Draft, key: ListKey, list: DraftItem[]): Draft {
  return { ...draft, lists: { ...draft.lists, [key]: list } };
}

/** Adds an exercise at the end of a list. An exercise appears once per list. */
export function addItem(draft: Draft, key: ListKey, exerciseId: string, reps: number): Draft {
  if (draft.lists[key].some((i) => i.exerciseId === exerciseId)) return draft;
  return update(draft, key, [...draft.lists[key], { exerciseId, reps, frequency: 'daily' }]);
}

export function removeItem(draft: Draft, key: ListKey, exerciseId: string): Draft {
  return update(
    draft,
    key,
    draft.lists[key].filter((i) => i.exerciseId !== exerciseId),
  );
}

/** Moves an exercise up (-1) or down (+1). Moving past either end does nothing. */
export function moveItem(draft: Draft, key: ListKey, exerciseId: string, by: -1 | 1): Draft {
  const list = [...draft.lists[key]];
  const from = list.findIndex((i) => i.exerciseId === exerciseId);
  const to = from + by;
  if (from === -1 || to < 0 || to >= list.length) return draft;
  [list[from], list[to]] = [list[to]!, list[from]!];
  return update(draft, key, list);
}

export function setItem(
  draft: Draft,
  key: ListKey,
  exerciseId: string,
  change: Partial<Omit<DraftItem, 'exerciseId'>>,
): Draft {
  return update(
    draft,
    key,
    draft.lists[key].map((i) => (i.exerciseId === exerciseId ? { ...i, ...change } : i)),
  );
}

/**
 * Switches between the same set every day and a set per weekday. Going to
 * weekdays copies the daily set to every day; going back keeps the first
 * weekday that has exercises.
 */
export function setVariation(draft: Draft, variation: Variation): Draft {
  if (variation === draft.variation) return draft;
  const lists = emptyLists();
  if (variation === 'by_weekday') {
    for (const day of WEEKDAY_KEYS) lists[day] = draft.lists.all.map((i) => ({ ...i }));
  } else {
    const first = WEEKDAY_KEYS.map((d) => draft.lists[d]).find((l) => l.length > 0) ?? [];
    lists.all = first.map((i) => ({ ...i }));
  }
  return { ...draft, variation, lists };
}

/** The lists in use for the draft's variation. */
export function activeKeys(draft: Draft): ListKey[] {
  return draft.variation === 'by_weekday' ? [...WEEKDAY_KEYS] : ['all'];
}

export type DraftProblem = 'startInPast' | 'noItems' | 'repsOutOfRange';

export function problems(draft: Draft, today: LocalDate): DraftProblem[] {
  const items = activeKeys(draft).flatMap((k) => draft.lists[k]);
  const found: DraftProblem[] = [];
  if (draft.startDate < today) found.push('startInPast');
  if (items.length === 0) found.push('noItems');
  if (items.some((i) => !Number.isInteger(i.reps) || i.reps < MIN_REPS || i.reps > MAX_REPS)) {
    found.push('repsOutOfRange');
  }
  return found;
}

/** The p_items of save_prescription(): in order, with a weekday for by_weekday programmes. */
export function toRpcItems(
  draft: Draft,
): { exercise_id: string; reps: number; frequency: Frequency; weekday?: number }[] {
  return activeKeys(draft).flatMap((key) =>
    draft.lists[key].map((i) => ({
      exercise_id: i.exerciseId,
      reps: i.reps,
      frequency: i.frequency,
      ...(key === 'all' ? {} : { weekday: Number(key) }),
    })),
  );
}
