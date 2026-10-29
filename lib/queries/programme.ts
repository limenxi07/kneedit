import { useQuery } from '@tanstack/react-query';

import {
  programmeFromRows,
  type PrescriptionRow,
  type Programme,
  type RoutineItemRow,
} from '@/lib/progress';
import { supabase, type Tables } from '@/lib/supabase/client';

export type Exercise = Tables<'exercises'>;

/** The exercise library, by id. Read-only for everyone signed in. */
export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('exercises').select('*').order('sort_order');
      if (error) throw error;
      return new Map(data.map((e) => [e.id, e]));
    },
  });
}

export type ProgrammeData = { programme: Programme };

/**
 * A senior's whole programme: the starter routine and every prescription
 * version, so lib/progress can work out any day. RLS lets the senior and
 * their care team read it.
 */
export function useProgramme(seniorId: string) {
  return useQuery({
    queryKey: ['programme', seniorId],
    queryFn: async (): Promise<ProgrammeData> => {
      const [senior, routine, prescriptions] = await Promise.all([
        supabase.from('seniors').select('created_at').eq('profile_id', seniorId).single(),
        supabase.from('default_routine_items').select('position, exercise_id, reps, frequency'),
        supabase
          .from('prescriptions')
          .select(
            'id, start_date, created_at, variation, prescription_items (position, exercise_id, reps, frequency, weekday)',
          )
          .eq('senior_id', seniorId),
      ]);
      if (senior.error) throw senior.error;
      if (routine.error) throw routine.error;
      if (prescriptions.error) throw prescriptions.error;
      return {
        programme: programmeFromRows({
          seniorCreatedAt: senior.data.created_at,
          defaultRoutine: routine.data satisfies RoutineItemRow[],
          prescriptions: prescriptions.data satisfies PrescriptionRow[],
        }),
      };
    },
  });
}
