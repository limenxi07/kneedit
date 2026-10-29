import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { PhysioHeader } from '@/components/physio/PhysioHeader';
import { PendingRequest } from '@/components/shared/PendingRequest';
import { RedeemCodeForm } from '@/components/shared/RedeemCodeForm';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { PlusBadge } from '@/components/ui/PlusBadge';
import { SampleDataTag } from '@/components/ui/SampleDataTag';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { formatNumber, formatPercent } from '@/lib/i18n/format';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { localDate, weekStart } from '@/lib/progress';
import { useMyLinksAsMember } from '@/lib/queries/links';
import { usePatients, type PatientRow } from '@/lib/queries/physio';
import { errorKey } from '@/lib/supabase/errors';

/** Patients: search, this week's %, flags, requests sent, and adding a patient by code. */
export default function Patients() {
  const { t } = useTranslation(['physio', 'common']);
  const patients = usePatients();
  const links = useMyLinksAsMember('physio');
  const [sent, setSent] = useState(false);
  const [search, setSearch] = useState('');
  const pending = links.data?.filter((l) => l.status === 'pending') ?? [];
  const query = search.trim().toLowerCase();
  const shown = (patients.data ?? []).filter((p) => p.name.toLowerCase().includes(query));
  const error = patients.error ?? links.error;

  return (
    <Screen width="wide">
      <PhysioHeader />
      <View className="gap-6 lg:flex-row">
        <View className="gap-4 lg:flex-[2]">
          <Text variant="title">{t('patients.title')}</Text>
          {patients.data && patients.data.length > 0 ? (
            <TextField
              label={t('patients.search')}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
          ) : null}
          <View className="flex-row flex-wrap items-center gap-2">
            <Text>{t('patients.flagsNote')}</Text>
            <PlusBadge />
          </View>

          {patients.isPending ? <Loading /> : null}
          {error ? <Notice tone="error">{t(`common:errors.${errorKey(error)}`)}</Notice> : null}
          {patients.isSuccess && patients.data.length === 0 ? (
            <Card>
              <Text variant="subheading">{t('patients.emptyTitle')}</Text>
              <Text>{t('patients.emptyBody')}</Text>
            </Card>
          ) : null}
          {patients.isSuccess && patients.data.length > 0 && shown.length === 0 ? (
            <Text>{t('patients.noMatch', { search: search.trim() })}</Text>
          ) : null}
          {shown.map((p) => (
            <PatientCard key={p.seniorId} patient={p} />
          ))}

          {pending.length > 0 ? <Text variant="heading">{t('patients.pendingTitle')}</Text> : null}
          {pending.map((l) => (
            <PendingRequest key={l.id} link={l} />
          ))}
        </View>

        <Card className="lg:flex-1 lg:self-start">
          <Text variant="subheading">{t('patients.addTitle')}</Text>
          <Text>{t('patients.addBody')}</Text>
          {sent ? <Notice tone="success">{t('patients.sent')}</Notice> : null}
          <RedeemCodeForm role="physio" onSent={() => setSent(true)} />
        </Card>
      </View>
    </Screen>
  );
}

function PatientCard({ patient }: { patient: PatientRow }) {
  const { t } = useTranslation('physio');
  const { language } = useLanguage();
  const s = patient.stats;
  const thisWeek = s && s.week_start === weekStart(localDate(new Date())) ? s : null;
  const missed = thisWeek?.missed_days_this_week ?? 0;
  const flags = [
    ...(patient.painThisWeek > 0
      ? [
          t('patients.flags.pain', {
            count: patient.painThisWeek,
            value: formatNumber(patient.painThisWeek, language),
          }),
        ]
      : []),
    ...(missed > 0
      ? [t('patients.flags.missed', { count: missed, value: formatNumber(missed, language) })]
      : []),
  ];

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={t('patients.open', { name: patient.name })}
      onPress={() => router.push({ pathname: '/patients/[id]', params: { id: patient.seniorId } })}
      className="active:opacity-80"
    >
      <Card className="lg:flex-row lg:items-center lg:justify-between">
        <View className="gap-1">
          <Text variant="subheading">{patient.name}</Text>
          {s?.includes_sample_data ? <SampleDataTag /> : null}
          <Text>
            {thisWeek
              ? t('patients.week', {
                  done: formatNumber(thisWeek.week_done, language),
                  prescribed: formatNumber(thisWeek.week_prescribed, language),
                  rate: formatPercent(thisWeek.week_rate, language),
                })
              : t('patients.noWeek')}
          </Text>
        </View>
        <View className="gap-1 lg:items-end">
          {flags.length === 0 ? (
            <Text variant="bodyStrong">{t('patients.flags.onTrack')}</Text>
          ) : (
            flags.map((f) => (
              <Text key={f} variant="bodyStrong">
                {f}
              </Text>
            ))
          )}
        </View>
      </Card>
    </Pressable>
  );
}
