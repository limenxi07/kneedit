import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { PatientTabs } from '@/components/physio/PatientTabs';
import { PhysioHeader } from '@/components/physio/PhysioHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChoiceGroup } from '@/components/ui/ChoiceGroup';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { formatNumber } from '@/lib/i18n/format';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { usePatient, useSaveClinical, type Patient } from '@/lib/queries/physio';
import type { Tables } from '@/lib/supabase/client';
import { errorKey } from '@/lib/supabase/errors';

type Knee = NonNullable<Tables<'senior_clinical'>['affected_knee']>;
const KNEES = ['left', 'right', 'both'] as const satisfies readonly Knee[];

/** Details: who the patient is, and the clinical details only the senior and physio see (Q7). */
export default function PatientDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const patient = usePatient(id);
  const { t } = useTranslation(['physio', 'common']);
  return (
    <Screen width="wide">
      <PhysioHeader />
      <PatientTabs id={id} name={patient.data?.name ?? ''} current="details" />
      {patient.isPending ? <Loading /> : null}
      {patient.error ? (
        <Notice tone="error">{t(`common:errors.${errorKey(patient.error)}`)}</Notice>
      ) : null}
      {patient.data ? (
        <Details key={patient.data.clinical?.updated_at} patient={patient.data} />
      ) : null}
    </Screen>
  );
}

function Details({ patient }: { patient: Patient }) {
  const { t } = useTranslation(['physio', 'common']);
  const { language } = useLanguage();
  const save = useSaveClinical(patient.profile_id);
  const [knee, setKnee] = useState<Knee | null>(patient.clinical?.affected_knee ?? null);
  const [notes, setNotes] = useState(patient.clinical?.notes ?? '');
  const age = patient.birth_year ? new Date().getFullYear() - patient.birth_year : null;
  const yesNo = (v: boolean) => t(v ? 'details.on' : 'details.off');

  return (
    <View className="gap-6 lg:flex-row">
      <Card className="lg:flex-1 lg:self-start">
        <Text variant="subheading">{t('details.aboutTitle')}</Text>
        <Text>
          {age === null
            ? t('details.ageUnknown')
            : t('details.age', { value: formatNumber(age, language) })}
        </Text>
        <Text>
          {t('details.gender', {
            gender: patient.gender ? t(`common:gender.${patient.gender}`) : t('details.notGiven'),
          })}
        </Text>
        <Text variant="bodyStrong">{t('details.sharingTitle')}</Text>
        <Text>{t('details.shareReport', { value: yesNo(patient.share_weekly_report) })}</Text>
        <Text>{t('details.shareFalls', { value: yesNo(patient.share_fall_alerts) })}</Text>
        <Text>{t('details.leaderboard', { value: yesNo(patient.show_on_leaderboard) })}</Text>
      </Card>

      <Card className="lg:flex-[2]">
        <Text variant="subheading">{t('details.clinicalTitle')}</Text>
        <Text>{t('details.clinicalIntro')}</Text>
        <ChoiceGroup
          label={t('details.knee')}
          layout="wrap"
          value={knee}
          onChange={(v) => {
            setKnee(v);
            save.reset();
          }}
          options={KNEES.map((k) => ({ value: k, label: t(`details.knees.${k}`) }))}
        />
        <TextField
          label={t('details.notes')}
          hint={t('details.notesHint')}
          value={notes}
          onChangeText={(v) => {
            setNotes(v);
            save.reset();
          }}
          multiline
          maxLength={4000}
        />
        {save.error ? (
          <Notice tone="error">{t(`common:errors.${errorKey(save.error)}`)}</Notice>
        ) : null}
        {save.isSuccess ? <Notice tone="success">{t('details.saved')}</Notice> : null}
        <Button
          label={save.isPending ? t('common:status.saving') : t('details.save')}
          disabled={save.isPending}
          onPress={() =>
            save.mutate({ exists: patient.clinical !== null, affectedKnee: knee, notes })
          }
        />
      </Card>
    </View>
  );
}
