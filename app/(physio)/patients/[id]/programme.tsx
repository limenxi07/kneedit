import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { PatientTabs } from '@/components/physio/PatientTabs';
import { PhysioHeader } from '@/components/physio/PhysioHeader';
import { ProgrammeEditor } from '@/components/physio/ProgrammeEditor';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { formatDate, formatNumber, formatWeekday } from '@/lib/i18n/format';
import { localized } from '@/lib/i18n/localized';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { localDate, planOn, type Plan } from '@/lib/progress';
import { usePatient } from '@/lib/queries/physio';
import { useExercises, useProgramme, type Exercise } from '@/lib/queries/programme';
import { errorKey } from '@/lib/supabase/errors';

/** Programme: what the patient does now, and the editor for a new version. */
export default function PatientProgramme() {
  const { t } = useTranslation(['physio', 'common']);
  const { language } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const patient = usePatient(id);
  const programme = useProgramme(id);
  const exercises = useExercises();
  const [editing, setEditing] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [saved, setSaved] = useState(false);

  const today = localDate(new Date());
  const current = programme.data ? planOn(programme.data.programme, today) : null;
  const upcoming = programme.data?.programme.prescriptions
    .filter((p) => p.startDate > today)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const error = programme.error ?? exercises.error;
  const date = (d: string) => formatDate(new Date(`${d}T12:00:00+08:00`), language);

  return (
    <Screen width="wide">
      <PhysioHeader />
      <PatientTabs id={id} name={patient.data?.name ?? ''} current="programme" />
      {programme.isPending || exercises.isPending ? <Loading /> : null}
      {error ? <Notice tone="error">{t(`common:errors.${errorKey(error)}`)}</Notice> : null}

      {exercises.data && programme.data ? (
        <>
          <View className="gap-4 lg:flex-row">
            {current ? (
              <PlanSummary
                title={
                  current.prescriptionId
                    ? t('programme.currentSince', { date: date(current.startDate) })
                    : t('programme.starter')
                }
                plan={current}
                exercises={exercises.data}
              />
            ) : null}
            {upcoming ? (
              <PlanSummary
                title={t('programme.upcoming', { date: date(upcoming.startDate) })}
                plan={{ ...upcoming, prescriptionId: upcoming.id }}
                exercises={exercises.data}
              />
            ) : null}
          </View>
          {saved ? <Notice tone="success">{t('programme.saved')}</Notice> : null}
          {editing ? (
            <ProgrammeEditor
              key={editorKey}
              seniorId={id}
              current={upcoming ? { ...upcoming, prescriptionId: upcoming.id } : current}
              exercises={exercises.data}
              onSaved={() => {
                setSaved(true);
                setEditorKey((k) => k + 1);
              }}
            />
          ) : (
            <Button
              label={t('programme.change')}
              onPress={() => setEditing(true)}
              fullWidth={false}
            />
          )}
        </>
      ) : null}
    </Screen>
  );
}

function PlanSummary({
  title,
  plan,
  exercises: library,
}: {
  title: string;
  plan: Plan;
  exercises: Map<string, Exercise>;
}) {
  const { t } = useTranslation('physio');
  const { language } = useLanguage();
  const items = [...plan.items].sort(
    (a, b) => (a.weekday ?? 0) - (b.weekday ?? 0) || a.position - b.position,
  );
  return (
    <Card className="lg:flex-1">
      <Text variant="subheading">{title}</Text>
      {plan.prescriptionId === null ? <Text>{t('programme.draftLabel')}</Text> : null}
      {items.map((i) => (
        <Text key={`${i.weekday ?? 0}-${i.position}`}>
          {t(i.weekday ? 'programme.itemOnDay' : 'programme.item', {
            day: i.weekday ? formatWeekday(i.weekday, language, 'short') : '',
            name: localized(library.get(i.exerciseId)?.name, language),
            reps: formatNumber(i.reps, language),
            frequency: t(`programme.frequencies.${i.frequency}`),
          })}
        </Text>
      ))}
    </Card>
  );
}
