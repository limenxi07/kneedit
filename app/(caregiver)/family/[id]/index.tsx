import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { WeeklyReportCard } from '@/components/caregiver/WeeklyReportCard';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { PlusBadge } from '@/components/ui/PlusBadge';
import { SampleDataTag } from '@/components/ui/SampleDataTag';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { formatNumber } from '@/lib/i18n/format';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { localDate, weekStart } from '@/lib/progress';
import {
  useHasPlus,
  useLiveWeeklyReport,
  useNudgedToday,
  useSavedWeeklyReports,
  useSendNudge,
  useSeniorSummary,
  type SeniorSummary,
} from '@/lib/queries/caregiver';
import { useSeniorStats } from '@/lib/queries/stats';
import { errorKey } from '@/lib/supabase/errors';

/**
 * One family member: the free stats, then the Plus features (weekly report,
 * a gentle nudge, notes, alerts and visits), each with its Plus badge.
 */
export default function FamilyMember() {
  const { t } = useTranslation(['caregiver', 'common']);
  const { id } = useLocalSearchParams<{ id: string }>();
  const senior = useSeniorSummary(id);

  return (
    <Screen>
      <BackButton fallback="/overview" />
      {senior.isPending ? <Loading /> : null}
      {senior.error ? (
        <Notice tone="error">{t(`common:errors.${errorKey(senior.error)}`)}</Notice>
      ) : null}
      {senior.data ? <Member senior={senior.data} /> : null}
    </Screen>
  );
}

function Member({ senior }: { senior: SeniorSummary }) {
  const { t } = useTranslation(['caregiver', 'common']);
  const { language } = useLanguage();
  const id = senior.profile_id;
  const hasPlus = useHasPlus(senior);
  const stats = useSeniorStats([id]);
  const s = stats.data?.get(id);
  const n = (value: number) => formatNumber(value, language);

  return (
    <>
      <Text variant="title">{senior.name}</Text>

      <Card>
        <Text variant="subheading">{t('member.statsTitle')}</Text>
        {s?.includes_sample_data ? <SampleDataTag /> : null}
        {s ? (
          <View className="gap-1">
            <Text>{t('overview.streak', { count: s.streak, value: n(s.streak) })}</Text>
            <Text>
              {t('overview.monthSessions', { count: s.month_sessions, value: n(s.month_sessions) })}
            </Text>
          </View>
        ) : (
          <Text>{t('overview.noStats', { name: senior.name })}</Text>
        )}
      </Card>

      <View className="gap-3">
        <Text variant="heading">{t('member.reportTitle')}</Text>
        <PlusBadge />
        {!hasPlus ? (
          <Notice>{t('member.needsPlus', { name: senior.name })}</Notice>
        ) : !senior.share_weekly_report ? (
          <Notice>{t('member.reportOff', { name: senior.name })}</Notice>
        ) : (
          <Reports seniorId={id} />
        )}
      </View>

      {hasPlus ? <Nudge senior={senior} /> : null}

      <View className="gap-3">
        <Button
          label={t('member.notes')}
          variant="secondary"
          fullWidth
          onPress={() => router.push({ pathname: '/family/[id]/notes', params: { id } })}
        />
        <Button
          label={t('member.alerts')}
          variant="secondary"
          fullWidth
          onPress={() => router.push({ pathname: '/family/[id]/alerts', params: { id } })}
        />
        <Button
          label={t('member.visits')}
          variant="secondary"
          fullWidth
          onPress={() => router.push({ pathname: '/family/[id]/visits', params: { id } })}
        />
      </View>
    </>
  );
}

/** This week, live, then the weeks already reported. */
function Reports({ seniorId }: { seniorId: string }) {
  const { t } = useTranslation(['caregiver', 'common']);
  const monday = weekStart(localDate(new Date()));
  const live = useLiveWeeklyReport(seniorId, monday, true);
  const saved = useSavedWeeklyReports(seniorId, true);
  const earlier = (saved.data ?? []).filter((r) => r.week_start < monday);
  const error = live.error ?? saved.error;

  return (
    <>
      {live.isPending ? <Loading /> : null}
      {error ? <Notice tone="error">{t(`common:errors.${errorKey(error)}`)}</Notice> : null}
      {live.report ? <WeeklyReportCard title={t('report.thisWeek')} report={live.report} /> : null}
      {earlier.map((r) => (
        <WeeklyReportCard key={r.id} title={t('report.earlierWeek')} report={r.report} />
      ))}
    </>
  );
}

/** "Send a gentle nudge": one a day, shown on the senior's Today screen. */
function Nudge({ senior }: { senior: SeniorSummary }) {
  const { t } = useTranslation(['caregiver', 'common']);
  const sentToday = useNudgedToday(senior.profile_id);
  const send = useSendNudge(senior.profile_id);
  const done = sentToday.data === true || send.isSuccess;

  return (
    <Card tone="pink">
      <Text variant="subheading">{t('nudge.title')}</Text>
      <PlusBadge />
      <Text>{t('nudge.body', { name: senior.name })}</Text>
      {send.error ? (
        <Notice tone="error">{t(`common:errors.${errorKey(send.error)}`)}</Notice>
      ) : null}
      {done ? (
        <Notice tone="success">{t('nudge.sent', { name: senior.name })}</Notice>
      ) : (
        <Button
          label={send.isPending ? t('common:status.sending') : t('nudge.send')}
          disabled={send.isPending || sentToday.isPending}
          onPress={() => send.mutate()}
        />
      )}
    </Card>
  );
}
