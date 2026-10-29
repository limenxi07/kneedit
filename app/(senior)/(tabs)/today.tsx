import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { TodayPlan } from '@/components/senior/TodayPlan';
import { WeekProgress } from '@/components/senior/WeekProgress';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { SampleDataTag } from '@/components/ui/SampleDataTag';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useUserId } from '@/lib/auth/useAuth';
import { formatDate, formatNumber, formatTime, formatTimeOfDay } from '@/lib/i18n/format';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { REMINDERS_SUPPORTED } from '@/lib/notifications/reminder';
import { useReminderStatus, useTurnOnReminder } from '@/lib/notifications/useDailyReminder';
import { useMyCareTeam } from '@/lib/queries/links';
import { useMe } from '@/lib/queries/me';
import { useExercises, useProgramme } from '@/lib/queries/programme';
import {
  nextVisit,
  useLastFormScore,
  useLeaderboard,
  useMarkNudgesSeen,
  useMyStats,
  useMyVisits,
  useUnseenNudge,
} from '@/lib/queries/senior';
import { useTodaySessions } from '@/lib/queries/sessions';
import { errorKey } from '@/lib/supabase/errors';

/**
 * Today: the plan and the Start button first, then the week, the last form
 * score, any nudge from family and the next visit.
 */
export default function Today() {
  const { t } = useTranslation(['senior', 'common']);
  const { language } = useLanguage();
  const userId = useUserId();
  const { data: me } = useMe();
  const { data: team } = useMyCareTeam();
  const programme = useProgramme(userId);
  const exercises = useExercises();
  const sessions = useTodaySessions();
  const stats = useMyStats();
  const leaderboard = useLeaderboard();
  const formScore = useLastFormScore();
  const visits = useMyVisits();

  const requests = team?.filter((l) => l.status === 'pending').length ?? 0;
  const upcoming = visits.data ? nextVisit(visits.data) : null;

  const loading = programme.isPending || sessions.isPending || exercises.isPending;
  const error = programme.error ?? sessions.error ?? exercises.error;

  return (
    <Screen>
      <Text variant="title">{t('today.greeting', { name: me?.profile.display_name ?? '' })}</Text>
      <Text>{formatDate(new Date(), language, { dateStyle: 'full' })}</Text>

      {requests > 0 ? (
        <Card tone="pink">
          <Text variant="bodyStrong">{t('today.linkRequests', { count: requests })}</Text>
          <Button
            label={t('today.review')}
            variant="secondary"
            fullWidth
            onPress={() => router.push('/linked-people')}
          />
        </Card>
      ) : null}

      <NudgeCard />

      {loading ? <Loading /> : null}
      {error ? <Notice tone="error">{t(`common:errors.${errorKey(error)}`)}</Notice> : null}

      {programme.data && sessions.data && exercises.data ? (
        <TodayPlan
          programme={programme.data.programme}
          sessions={sessions.data}
          exercises={exercises.data}
        />
      ) : null}

      <Card tone="pink">
        <Text variant="bodyStrong">{t('common:safety.stopIfPain')}</Text>
      </Card>

      <WeekProgress stats={stats.data} leaderboard={leaderboard.data} />

      {formScore.isSuccess ? (
        <Card>
          <Text variant="subheading">{t('today.formTitle')}</Text>
          {formScore.data ? (
            <>
              {formScore.data.isSample ? <SampleDataTag /> : null}
              <Text>
                {t('today.formScore', { score: formatNumber(formScore.data.score, language) })}
              </Text>
            </>
          ) : (
            <Text>{t('session.formNeedsSleeve')}</Text>
          )}
        </Card>
      ) : null}

      {upcoming ? (
        <Card>
          <Text variant="subheading">{t('today.visitTitle')}</Text>
          <Text variant="bodyStrong">
            {t('common:visits.when', {
              date: formatDate(new Date(upcoming.scheduled_at), language, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              }),
              time: formatTime(new Date(upcoming.scheduled_at), language),
            })}
          </Text>
          <Text>
            {upcoming.physioName
              ? t('common:visits.with', { name: upcoming.physioName })
              : t('common:visits.withFormer')}
          </Text>
          {upcoming.location ? <Text>{upcoming.location}</Text> : null}
        </Card>
      ) : null}

      <ReminderCard time={me?.senior?.reminder_time} />
    </Screen>
  );
}

/** A gentle nudge from family, until the senior says thank you. */
function NudgeCard() {
  const { t } = useTranslation('senior');
  const nudge = useUnseenNudge();
  const markSeen = useMarkNudgesSeen();
  if (!nudge.data) return null;
  return (
    <Card tone="pink">
      <Text variant="bodyStrong">
        {nudge.data.senderName
          ? t('today.nudge', { name: nudge.data.senderName })
          : t('today.nudgeFormer')}
      </Text>
      <Button
        label={t('today.nudgeThanks')}
        variant="secondary"
        fullWidth
        disabled={markSeen.isPending}
        onPress={() => markSeen.mutate()}
      />
    </Card>
  );
}

/** Offers the daily reminder on a phone that hasn't been asked yet. */
function ReminderCard({ time }: { time: string | undefined }) {
  const { t } = useTranslation('senior');
  const { language } = useLanguage();
  const status = useReminderStatus();
  const turnOn = useTurnOnReminder();
  if (!REMINDERS_SUPPORTED || !time || status.data?.permission !== 'undetermined') return null;
  if (status.data.off) return null;
  return (
    <Card tone="primary">
      <Text>{t('today.reminderOffer', { time: formatTimeOfDay(time, language) })}</Text>
      <Button
        label={t('reminder.turnOn')}
        variant="secondary"
        fullWidth
        disabled={turnOn.isPending}
        onPress={() => turnOn.mutate()}
      />
    </Card>
  );
}
