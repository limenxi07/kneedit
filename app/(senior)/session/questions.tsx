import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EndSessionEarly } from '@/components/senior/EndSessionEarly';
import { YesNoQuestion } from '@/components/senior/YesNoQuestion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { localized } from '@/lib/i18n/localized';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { useAnswerExercise } from '@/lib/queries/sessions';
import { goToDone, thenGo, useSessionFlow } from '@/lib/session/useSessionFlow';
import { errorKey } from '@/lib/supabase/errors';

/**
 * Step 3: "Did it hurt?" and "Was it easy?" for the exercise just done. Both
 * need an answer, then Next, so a mis-tap can be fixed first.
 */
export default function Questions() {
  const flow = useSessionFlow();

  const here = flow.ready && flow.active && flow.step?.kind === 'questions';
  if (!flow.ready || (!here && flow.isFetching)) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }
  const { active, step, queue, exercises } = flow;
  if (!active || !step || step.kind === 'finished') return <Redirect href="/session" />;
  if (step.kind === 'exercise') return <Redirect href="/session/exercise" />;

  const record = active.session_exercises.find((e) => e.position === step.item.position);
  return (
    <Answer
      key={step.item.position}
      sessionId={active.id}
      position={step.item.position}
      isLast={step.index === queue.length - 1}
      name={exercises.get(step.item.exerciseId)?.name}
      initialHurt={record?.hurt ?? null}
      initialEasy={record?.easy ?? null}
    />
  );
}

type Props = {
  sessionId: string;
  position: number;
  isLast: boolean;
  name: Parameters<typeof localized>[0];
  initialHurt: boolean | null;
  initialEasy: boolean | null;
};

function Answer({ sessionId, position, isLast, name, initialHurt, initialEasy }: Props) {
  const { t } = useTranslation(['senior', 'common']);
  const { language } = useLanguage();
  const answer = useAnswerExercise();
  const [hurt, setHurt] = useState<boolean | null>(initialHurt);
  const [easy, setEasy] = useState<boolean | null>(initialEasy);

  const busy = answer.isPending;

  const next = () =>
    thenGo(
      answer.mutateAsync({
        sessionId,
        position,
        hurt,
        easy,
        thenEnd: isLast ? 'complete' : undefined,
      }),
      () => (isLast ? goToDone(sessionId) : router.replace('/session/exercise')),
    );

  // Ending early keeps the exercise just done, with whatever answers were given.
  const endEarly = () =>
    thenGo(answer.mutateAsync({ sessionId, position, hurt, easy, thenEnd: 'incomplete' }), () =>
      goToDone(sessionId),
    );

  return (
    <Screen>
      <Text variant="title">{t('questions.title', { name: localized(name, language) })}</Text>

      <YesNoQuestion label={t('questions.hurt')} value={hurt} onChange={setHurt} />
      {hurt ? <Notice tone="error">{t('common:safety.stopIfPain')}</Notice> : null}
      <YesNoQuestion label={t('questions.easy')} value={easy} onChange={setEasy} />

      {!hurt ? (
        <Card tone="pink">
          <Text variant="bodyStrong">{t('common:safety.stopIfPain')}</Text>
        </Card>
      ) : null}

      {answer.error ? (
        <Notice tone="error">{t(`common:errors.${errorKey(answer.error)}`)}</Notice>
      ) : null}
      <Button
        label={busy ? t('common:status.saving') : t(isLast ? 'questions.finish' : 'questions.next')}
        disabled={hurt === null || easy === null || busy}
        accessibilityHint={hurt === null || easy === null ? t('questions.answerBoth') : undefined}
        onPress={next}
      />
      {!isLast ? <EndSessionEarly onEnd={endEarly} disabled={busy} /> : null}
    </Screen>
  );
}
