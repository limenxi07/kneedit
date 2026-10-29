import { useQuery } from '@tanstack/react-query';

import {
  addDays,
  buildWeeklyReport,
  localDate,
  sessionFromRow,
  type WeeklyReport,
} from '@/lib/progress';
import { supabase } from '@/lib/supabase/client';

import { useProgramme } from './programme';

/**
 * Weekly reports, read by caregivers and physios. RLS decides who gets rows;
 * an empty answer means the senior isn't sharing it, or isn't on Plus.
 */

/** This week's report, worked out live from the senior's records with lib/progress. */
export function useLiveWeeklyReport(seniorId: string, weekStart: string, enabled: boolean) {
  const programme = useProgramme(seniorId);
  const today = localDate(new Date());
  const sunday = addDays(weekStart, 6);
  const records = useQuery({
    queryKey: ['weekly_records', seniorId, weekStart],
    enabled,
    queryFn: async () => {
      const [sessions, activity, falls] = await Promise.all([
        supabase
          .from('sessions')
          .select(
            'id, local_date, status, ended_at, source, session_exercises (exercise_id, hurt, easy, form_score)',
          )
          .eq('senior_id', seniorId)
          .gte('local_date', weekStart)
          .lte('local_date', sunday),
        supabase
          .from('daily_activity')
          .select('local_date, steps, source')
          .eq('senior_id', seniorId)
          .gte('local_date', weekStart)
          .lte('local_date', sunday),
        supabase
          .from('fall_events')
          .select('detected_at, source')
          .eq('senior_id', seniorId)
          // A day either side, then filtered by Singapore date in the report.
          .gte('detected_at', `${addDays(weekStart, -1)}T00:00:00Z`)
          .lte('detected_at', `${addDays(sunday, 1)}T23:59:59Z`),
      ]);
      if (sessions.error) throw sessions.error;
      if (activity.error) throw activity.error;
      if (falls.error) throw falls.error;
      return { sessions: sessions.data, activity: activity.data, falls: falls.data };
    },
  });

  const report: WeeklyReport | undefined =
    programme.data && records.data
      ? buildWeeklyReport({
          programme: programme.data.programme,
          sessions: records.data.sessions.map(sessionFromRow),
          activity: records.data.activity.map((a) => ({
            localDate: a.local_date,
            steps: a.steps,
            source: a.source,
          })),
          falls: records.data.falls.map((f) => ({
            localDate: localDate(f.detected_at),
            source: f.source,
          })),
          weekStart,
          today,
        })
      : undefined;

  return {
    report,
    isPending: enabled && (programme.isPending || records.isPending),
    error: programme.error ?? records.error,
  };
}

/** Reports saved for earlier weeks, latest first (generated on Mondays from Phase 7). */
export function useSavedWeeklyReports(seniorId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['weekly_reports', seniorId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('senior_id', seniorId)
        .order('week_start', { ascending: false })
        .limit(4);
      if (error) throw error;
      return data.map((r) => ({ ...r, report: r.report as unknown as WeeklyReport }));
    },
  });
}
