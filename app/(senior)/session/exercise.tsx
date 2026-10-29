import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { EndSessionEarly } from '@/components/senior/EndSessionEarly';
import { ExerciseVideo } from '@/components/senior/ExerciseVideo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { formatNumber } from '@/lib/i18n/format';
import { localized, localizedList } from '@/lib/i18n/localized';
import { useLanguage } from '@/lib/i18n/useLanguage';
import type { PlanItem } from '@/lib/progress';
import type { Exercise } from '@/lib/queries/programme';
import { useFinishSession, useRecordExercise } from '@/lib/queries/sessions';
import { goToDone, thenGo, useSessionFlow } from '@/lib/session/useSessionFlow';
import { useSessionSource } from '@/lib/session/useSleeveSource';
import { errorKey } from '@/lib/supabase/errors';

/** Step 2: one exercise, with the video, the steps and Done. There is no skip. */
export default function ExerciseScreen() {
  const flow = useSessionFlow();

  const here = flow.ready && flow.active && flow.step?.kind === 'exercise';
  if (!flow.ready || (!here && flow.isFetching)) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }
  const { active, step, queue, exercises } = flow;
  if (!active || !step) return <Redirect href="/session" />;
  if (step.kind === 'questions') return <Redirect href="/session/questions" />;
  if (step.kind === 'finished') return <Redirect href="/session" />;

  return (
    <CurrentExercise
      key={step.item.position}
      sessionId={active.id}
      item={step.item}
      index={step.index}
      total={queue.length}
      exercise={exercises.get(step.item.exerciseId)}
    />
  );
}

type Props = {
  sessionId: string;
  item: PlanItem;
  index: number;
  total: number;
  exercise: Exercise | undefined;
};

function CurrentExercise({ sessionId, item, index, total, exercise }: Props) {
  const { t } = useTranslation(['senior', 'common']);
  const { language } = useLanguage();
  const source = useSessionSource();
  const record = useRecordExercise();
  const finish = useFinishSession();
  const [onBreak, setOnBreak] = useState(false);

  const tracker = useMemo(
    () => source.startExercise({ exerciseId: item.exerciseId, repTarget: item.reps }),
    [source, item.exerciseId, item.reps],
  );
  useEffect(() => {
    if (onBreak) tracker.pause();
    else tracker.resume();
  }, [onBreak, tracker]);

  const name = localized(exercise?.name, language);
  const steps = localizedList(exercise?.steps, language);
  const busy = record.isPending || finish.isPending;
  const error = record.error ?? finish.error;

  const done = () =>
    thenGo(record.mutateAsync({ sessionId, item, measurement: tracker.finish() }), () =>
      router.replace('/session/questions'),
    );

  const endEarly = () =>
    thenGo(finish.mutateAsync({ sessionId, status: 'incomplete' }), () => goToDone(sessionId));

  return (
    <Screen>
      <Text variant="bodyStrong">
        {t('session.progress', {
          number: formatNumber(index + 1, language),
          total: formatNumber(total, language),
        })}
      </Text>
      <Text variant="title">{name}</Text>

      <ExerciseVideo videoPath={exercise?.video_path ?? null} name={name} paused={onBreak} />

      <Text variant="heading">
        {t('session.reps', { count: item.reps, value: formatNumber(item.reps, language) })}
      </Text>

      <Card>
        <Text variant="subheading">{t('session.stepsTitle')}</Text>
        <View accessibilityRole="list" className="gap-2">
          {steps.map((s, i) => (
            <Text key={i}>
              {t('session.step', { number: formatNumber(i + 1, language), text: s })}
            </Text>
          ))}
        </View>
      </Card>

      <Card tone="pink">
        <Text variant="bodyStrong">{t('common:safety.stopIfPain')}</Text>
      </Card>

      {error ? <Notice tone="error">{t(`common:errors.${errorKey(error)}`)}</Notice> : null}

      {onBreak ? (
        <>
          <Notice tone="success">{t('session.onBreak')}</Notice>
          <Button label={t('session.resume')} onPress={() => setOnBreak(false)} />
        </>
      ) : (
        <>
          <Button
            label={record.isPending ? t('common:status.saving') : t('session.done')}
            accessibilityHint={t('session.doneHint')}
            disabled={busy}
            onPress={done}
          />
          <Button
            label={t('session.takeBreak')}
            variant="secondary"
            fullWidth
            disabled={busy}
            onPress={() => setOnBreak(true)}
          />
        </>
      )}

      <EndSessionEarly onEnd={endEarly} disabled={busy} />
    </Screen>
  );
}
