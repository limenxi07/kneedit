import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useUserId } from '@/lib/auth/useAuth';
import { formatDate, formatNumber, formatWeekday } from '@/lib/i18n/format';
import { localized } from '@/lib/i18n/localized';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { localDate, planOn, type Plan, type PlanItem } from '@/lib/progress';
import { useExercises, useProgramme, type Exercise } from '@/lib/queries/programme';
import { errorKey } from '@/lib/supabase/errors';

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/** The senior's programme, read-only: what the physio set, or the Kneedit starter routine. */
export default function MyProgramme() {
  const { t } = useTranslation(['senior', 'common']);
  const { language } = useLanguage();
  const userId = useUserId();
  const programme = useProgramme(userId);
  const exercises = useExercises();

  const today = localDate(new Date());
  const data = programme.data;
  const current = data ? planOn(data.programme, today) : null;
  // A newer version the physio saved that starts later.
  const upcoming = data?.programme.prescriptions
    .filter((p) => p.startDate > today)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  const error = programme.error ?? exercises.error;

  return (
    <Screen>
      <BackButton fallback="/profile" />
      <Text variant="title">{t('programme.title')}</Text>

      {programme.isPending || exercises.isPending ? <Loading /> : null}
      {error ? <Notice tone="error">{t(`common:errors.${errorKey(error)}`)}</Notice> : null}

      {current && exercises.data ? (
        <PlanCard
          plan={current}
          exercises={exercises.data}
          heading={
            current.prescriptionId === null ? t('programme.starter') : t('programme.fromPhysio')
          }
          note={
            current.prescriptionId === null
              ? t('programme.draft')
              : t('programme.since', {
                  date: formatDate(new Date(`${current.startDate}T00:00:00+08:00`), language),
                })
          }
        />
      ) : null}

      {upcoming && exercises.data ? (
        <PlanCard
          plan={{ ...upcoming, prescriptionId: upcoming.id }}
          exercises={exercises.data}
          heading={t('programme.upcoming', {
            date: formatDate(new Date(`${upcoming.startDate}T00:00:00+08:00`), language),
          })}
        />
      ) : null}

      <Card tone="pink">
        <Text variant="bodyStrong">{t('common:safety.stopIfPain')}</Text>
      </Card>
      <Text>{t('programme.askPhysio')}</Text>
    </Screen>
  );
}

function PlanCard({
  plan,
  exercises,
  heading,
  note,
}: {
  plan: Plan;
  exercises: Map<string, Exercise>;
  heading: string;
  note?: string;
}) {
  const { t } = useTranslation('senior');
  const { language } = useLanguage();
  const byDay = plan.variation === 'by_weekday';
  return (
    <Card>
      <Text variant="subheading">{heading}</Text>
      {note ? <Text>{note}</Text> : null}
      {byDay ? (
        WEEKDAYS.map((day) => {
          const items = plan.items.filter((i) => i.weekday === day);
          return (
            <View key={day} className="gap-2">
              <Text variant="bodyStrong">{formatWeekday(day, language)}</Text>
              {items.length === 0 ? <Text>{t('programme.rest')}</Text> : null}
              <Items items={items} exercises={exercises} />
            </View>
          );
        })
      ) : (
        <Items items={plan.items} exercises={exercises} />
      )}
    </Card>
  );
}

function Items({ items, exercises }: { items: PlanItem[]; exercises: Map<string, Exercise> }) {
  const { t } = useTranslation('senior');
  const { language } = useLanguage();
  return (
    <View className="gap-2">
      {[...items]
        .sort((a, b) => a.position - b.position)
        .map((item) => (
          <View key={`${item.weekday ?? 0}-${item.position}`} className="gap-1">
            <Text variant="bodyStrong">
              {localized(exercises.get(item.exerciseId)?.name, language)}
            </Text>
            <Text>
              {t('programme.itemDetail', {
                reps: t('session.reps', {
                  count: item.reps,
                  value: formatNumber(item.reps, language),
                }),
                frequency: t(`programme.frequency.${item.frequency}`),
              })}
            </Text>
          </View>
        ))}
    </View>
  );
}
