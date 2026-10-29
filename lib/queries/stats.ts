import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';

/** Streak and sessions this month, free for the whole care team. */
export function useSeniorStats(seniorIds: string[]) {
  return useQuery({
    queryKey: ['senior_stats', [...seniorIds].sort()],
    enabled: seniorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('senior_stats')
        .select('senior_id, streak, month_sessions, includes_sample_data')
        .in('senior_id', seniorIds);
      if (error) throw error;
      return new Map(data.map((s) => [s.senior_id, s]));
    },
  });
}
