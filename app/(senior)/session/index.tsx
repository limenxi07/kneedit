import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { formatNumber } from '@/lib/i18n/format';
import { localized } from '@/lib/i18n/localized';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { useStartSession } from '@/lib/queries/sessions';
import { thenGo, useGoToStep, useSessionFlow } from '@/lib/session/useSessionFlow';
import { errorKey } from '@/lib/supabase/errors';

/** Step 1 of the session: what's in it, then Start (or Continue). */
export default function SessionOverview() {
  const { t } = useTranslation(['senior', 'common']);
  const { language } = useLanguage();
  const flow = useSessionFlow();
  const start = useStartSession();
  const goTo = useGoToStep();

  if (!flow.ready) {
    return (
      <Screen>
        <BackButton fallback="/today" />
        {flow.isPending ? <Loading /> : null}
        {flow.error ? (
          <Notice tone="error">{t(`common:errors.${errorKey(flow.error)}`)}</Notice>
        ) : null}
      </Screen>
    );
  }

  const { active, queue, step, exercises } = flow;
  const done = new Set(active?.session_exercises.map((e) => e.position) ?? []);
  const error = start.error ?? goTo.error;

  const begin = () => {
    if (active && step) return thenGo(goTo.go(active.id, step), () => {});
    thenGo(start.mutateAsync(), () => router.replace('/session/exercise'));
  };

  return (
    <Screen>
      <BackButton fallback="/today" />
      <Text variant="title">{t(flow.isExtra ? 'session.extraTitle' : 'session.title')}</Text>

      {queue.length === 0 ? (
        <Card>
          <Text variant="bodyStrong">{t('today.restTitle')}</Text>
          <Text>{t('today.restBody')}</Text>
        </Card>
      ) : (
        <>
          {flow.isExtra ? <Notice>{t('session.extraBody')}</Notice> : null}
          <Text>
            {t('session.overview', {
              count: queue.length,
              value: formatNumber(queue.length, language),
            })}
          </Text>
          <View className="gap-3">
            {queue.map((item, index) => (
              <Card key={item.position} tone={done.has(item.position) ? 'primary' : 'white'}>
                <Text variant="bodyStrong">
                  {t('session.numbered', {
                    number: formatNumber(index + 1, language),
                    name: localized(exercises.get(item.exerciseId)?.name, language),
                  })}
                </Text>
                <Text>
                  {t('session.reps', {
                    count: item.reps,
                    value: formatNumber(item.reps, language),
                  })}
                </Text>
                {done.has(item.position) ? <Text>{t('session.doneMark')}</Text> : null}
              </Card>
            ))}
          </View>

          <Card tone="pink">
            <Text variant="bodyStrong">{t('common:safety.stopIfPain')}</Text>
          </Card>

          {error ? <Notice tone="error">{t(`common:errors.${errorKey(error)}`)}</Notice> : null}
          <Button
            label={
              start.isPending || goTo.finishing
                ? t('common:status.saving')
                : t(active ? 'today.continue' : 'session.start')
            }
            disabled={start.isPending || goTo.finishing}
            onPress={begin}
          />
        </>
      )}
    </Screen>
  );
}
