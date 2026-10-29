import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { formatNumber } from '@/lib/i18n/format';
import { localized } from '@/lib/i18n/localized';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { localDate, prescribedSlots, type Programme } from '@/lib/progress';
import type { Exercise } from '@/lib/queries/programme';
import type { SessionWithExercises } from '@/lib/queries/sessions';
import { nextQueue } from '@/lib/session/flow';

type Props = {
  programme: Programme;
  sessions: SessionWithExercises[];
  exercises: Map<string, Exercise>;
};

/** Today's exercises and the one main action: Start, Continue, or, once done, Do them again. */
export function TodayPlan({ programme, sessions, exercises }: Props) {
  const { t } = useTranslation('senior');
  const { language } = useLanguage();
  const today = localDate(new Date());
  const slots = prescribedSlots(programme, today);
  const inProgress = sessions.find((s) => s.status === 'in_progress');
  const complete = sessions.filter((s) => s.status === 'complete').length;
  const queue = nextQueue(programme, today, sessions);
  const allDone = slots > 0 && complete >= slots;

  if (slots === 0) {
    return (
      <Card>
        <Text variant="subheading">{t('today.planTitle')}</Text>
        <Text variant="bodyStrong">{t('today.restTitle')}</Text>
        <Text>{t('today.restBody')}</Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text variant="subheading">{t('today.planTitle')}</Text>
      {slots > 1 ? (
        <Text variant="bodyStrong">
          {t('today.sessionsDone', {
            done: formatNumber(Math.min(complete, slots), language),
            slots: formatNumber(slots, language),
          })}
        </Text>
      ) : null}
      {allDone && !inProgress ? (
        <>
          <Text variant="bodyStrong">{t('today.allDoneTitle')}</Text>
          <Text>{t('today.allDoneBody')}</Text>
        </>
      ) : (
        <View className="gap-2">
          {queue.map((item) => (
            <Text key={item.position}>
              {t('today.item', {
                name: localized(exercises.get(item.exerciseId)?.name, language),
                count: item.reps,
                reps: formatNumber(item.reps, language),
              })}
            </Text>
          ))}
        </View>
      )}
      {inProgress ? (
        <Button label={t('today.continue')} onPress={() => router.push('/session')} />
      ) : allDone ? (
        <Button
          label={t('today.again')}
          variant="secondary"
          fullWidth
          accessibilityHint={t('today.againHint')}
          onPress={() => router.push('/session')}
        />
      ) : (
        <Button label={t('today.start')} onPress={() => router.push('/session')} />
      )}
    </Card>
  );
}
