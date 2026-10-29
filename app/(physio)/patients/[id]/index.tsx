import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { PatientTabs } from '@/components/physio/PatientTabs';
import { PhysioHeader } from '@/components/physio/PhysioHeader';
import { VisitSummaryView } from '@/components/physio/VisitSummaryView';
import { WeeklyReportCard } from '@/components/shared/WeeklyReportCard';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { PlusBadge } from '@/components/ui/PlusBadge';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { formatDate } from '@/lib/i18n/format';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { localDate, weekStart } from '@/lib/progress';
import { useCaregiverNotes } from '@/lib/queries/caregiver';
import { useLiveSummary, usePatient, usePatientVisits } from '@/lib/queries/physio';
import { useLiveWeeklyReport, useSavedWeeklyReports } from '@/lib/queries/reports';
import { errorKey } from '@/lib/supabase/errors';

/** Overview: the summary since the last visit, weekly reports and notes from family. */
export default function PatientOverview() {
  const { t } = useTranslation(['physio', 'common']);
  const { id } = useLocalSearchParams<{ id: string }>();
  const patient = usePatient(id);
  const visits = usePatientVisits(id);
  const last = visits.data?.find((v) => v.status === 'completed' && v.completed_at);
  const lastDate = last?.completed_at ? localDate(last.completed_at) : null;

  return (
    <Screen width="wide">
      <PhysioHeader />
      <PatientTabs id={id} name={patient.data?.name ?? ''} current="overview" />
      {patient.error ? (
        <Notice tone="error">{t(`common:errors.${errorKey(patient.error)}`)}</Notice>
      ) : null}
      {visits.isSuccess ? (
        <View className="gap-6 lg:flex-row">
          <View className="gap-4 lg:flex-[3]">
            <LiveSummary seniorId={id} lastDate={lastDate} />
            <Reports seniorId={id} />
          </View>
          <View className="gap-4 lg:flex-[2]">
            <Notes seniorId={id} />
          </View>
        </View>
      ) : (
        <Loading />
      )}
    </Screen>
  );
}

function LiveSummary({ seniorId, lastDate }: { seniorId: string; lastDate: string | null }) {
  const { t } = useTranslation(['physio', 'common']);
  const { language } = useLanguage();
  const live = useLiveSummary(seniorId, lastDate);
  return (
    <Card>
      <Text variant="subheading">
        {lastDate
          ? t('overview.sinceVisit', {
              date: formatDate(new Date(`${lastDate}T12:00:00+08:00`), language),
            })
          : t('overview.sinceStart')}
      </Text>
      {live.isPending ? <Loading /> : null}
      {live.error ? (
        <Notice tone="error">{t(`common:errors.${errorKey(live.error)}`)}</Notice>
      ) : null}
      {live.summary ? (
        <VisitSummaryView
          adherence={live.summary.adherence}
          details={live.summary.details}
          includesSampleData={live.summary.includesSampleData}
        />
      ) : null}
    </Card>
  );
}

function Reports({ seniorId }: { seniorId: string }) {
  const { t } = useTranslation(['physio', 'common']);
  const monday = weekStart(localDate(new Date()));
  const live = useLiveWeeklyReport(seniorId, monday, true);
  const saved = useSavedWeeklyReports(seniorId, true);
  const earlier = (saved.data ?? []).filter((r) => r.week_start < monday);
  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap items-center gap-2">
        <Text variant="heading">{t('overview.reportsTitle')}</Text>
        <PlusBadge />
      </View>
      {live.report ? (
        <WeeklyReportCard title={t('common:report.thisWeek')} report={live.report} />
      ) : null}
      {earlier.map((r) => (
        <WeeklyReportCard key={r.id} title={t('common:report.earlierWeek')} report={r.report} />
      ))}
    </View>
  );
}

function Notes({ seniorId }: { seniorId: string }) {
  const { t } = useTranslation(['physio', 'common']);
  const { language } = useLanguage();
  const notes = useCaregiverNotes(seniorId);
  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap items-center gap-2">
        <Text variant="heading">{t('overview.notesTitle')}</Text>
        <PlusBadge />
      </View>
      {notes.isSuccess && notes.data.length === 0 ? <Text>{t('overview.noNotes')}</Text> : null}
      {notes.data?.map((note) => (
        <Card key={note.id}>
          <Text>{note.body}</Text>
          <Text variant="bodyStrong">
            {t(note.authorName ? 'overview.noteFrom' : 'overview.noteFromFormer', {
              name: note.authorName ?? '',
              date: formatDate(new Date(note.created_at), language),
            })}
          </Text>
        </Card>
      ))}
    </View>
  );
}
