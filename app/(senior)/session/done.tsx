import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { WeekProgress } from '@/components/senior/WeekProgress';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { SampleDataTag } from '@/components/ui/SampleDataTag';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useUserId } from '@/lib/auth/useAuth';
import { formatNumber } from '@/lib/i18n/format';
import { localized } from '@/lib/i18n/localized';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { prescribedSlots } from '@/lib/progress';
import { useExercises, useProgramme } from '@/lib/queries/programme';
import { useLeaderboard, useMyStats } from '@/lib/queries/senior';
import { useSession, useTodaySessions } from '@/lib/queries/sessions';
import { isCounted } from '@/lib/session/flow';
import { errorKey } from '@/lib/supabase/errors';

type Outcome = 'counted' | 'extra' | 'ended';

/** Step 4: the answers for each exercise, the form score, and the updated week. */
export default function SessionDone() {
  const { t } = useTranslation(['senior', 'common']);
  const { language } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  const session = useSession(id);
  const today = useTodaySessions();
  const programme = useProgramme(userId);
  const exercises = useExercises();
  const stats = useMyStats();
  const leaderboard = useLeaderboard();

  const s = session.data;
  const error = session.error ?? today.error ?? programme.error;
  if (!s || !today.data || !programme.data || !exercises.data) {
    return (
      <Screen>
        {error ? (
          <Notice tone="error">{t(`common:errors.${errorKey(error)}`)}</Notice>
        ) : (
          <Loading />
        )}
        <Button label={t('done.backToToday')} onPress={() => router.replace('/today')} />
      </Screen>
    );
  }

  const slots = prescribedSlots(programme.data.programme, s.local_date);
  const outcome: Outcome =
    s.status !== 'complete' ? 'ended' : isCounted(s, today.data, slots) ? 'counted' : 'extra';
  const done = [...s.session_exercises].sort((a, b) => a.position - b.position);
  const answer = (value: boolean | null) =>
    value === null ? t('done.notAnswered') : value ? t('questions.yes') : t('questions.no');

  return (
    <Screen>
      <Text variant="title">{t(`done.title.${outcome}`)}</Text>
      <Text>{t(`done.body.${outcome}`)}</Text>

      <View className="gap-3">
        {done.map((e) => (
          <Card key={e.id}>
            <Text variant="subheading">
              {localized(exercises.data.get(e.exercise_id)?.name, language)}
            </Text>
            <Text>{t('done.hurt', { answer: answer(e.hurt) })}</Text>
            <Text>{t('done.easy', { answer: answer(e.easy) })}</Text>
            {e.form_score === null ? (
              <Text>{t('session.formNeedsSleeve')}</Text>
            ) : (
              <>
                {e.source === 'fake' ? <SampleDataTag /> : null}
                <Text>
                  {t('today.formScore', {
                    score: formatNumber(Number(e.form_score), language),
                  })}
                </Text>
              </>
            )}
          </Card>
        ))}
      </View>

      {done.some((e) => e.hurt) ? (
        <Notice tone="error">{t('common:safety.stopIfPain')}</Notice>
      ) : null}

      <WeekProgress stats={stats.data} leaderboard={leaderboard.data} />

      <Button label={t('done.backToToday')} onPress={() => router.replace('/today')} />
    </Screen>
  );
}
