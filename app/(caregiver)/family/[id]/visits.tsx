import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { VisitCard } from '@/components/shared/VisitCard';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { PlusBadge } from '@/components/ui/PlusBadge';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { buildIcs } from '@/lib/calendar/ics';
import { saveIcs } from '@/lib/calendar/saveIcs';
import { useHasPlus, useSeniorSummary } from '@/lib/queries/caregiver';
import { splitVisits, useVisitsFor, type Visit } from '@/lib/queries/senior';
import { errorKey } from '@/lib/supabase/errors';

/** The family member's visits with the physio (Plus), each one addable to a calendar. */
export default function FamilyVisits() {
  const { t } = useTranslation(['caregiver', 'common']);
  const { id } = useLocalSearchParams<{ id: string }>();
  const senior = useSeniorSummary(id);
  const hasPlus = useHasPlus(senior.data);
  const visits = useVisitsFor(id);
  const { upcoming, past } = splitVisits(visits.data ?? []);
  const name = senior.data?.name ?? '';

  return (
    <Screen>
      <BackButton fallback={{ pathname: '/family/[id]', params: { id } }} />
      <Text variant="title">{t('visits.title', { name })}</Text>
      <PlusBadge />
      <Text>{t('visits.intro', { name })}</Text>

      {!hasPlus ? <Notice>{t('member.needsPlus', { name })}</Notice> : null}
      {visits.isPending ? <Loading /> : null}
      {visits.error ? (
        <Notice tone="error">{t(`common:errors.${errorKey(visits.error)}`)}</Notice>
      ) : null}

      <View className="gap-3">
        <Text variant="heading">{t('visits.upcomingTitle')}</Text>
        {visits.isSuccess && upcoming.length === 0 ? <Text>{t('visits.none')}</Text> : null}
        {upcoming.map((v) => (
          <VisitCard key={v.id} visit={v}>
            <AddToCalendar visit={v} name={name} />
          </VisitCard>
        ))}
      </View>

      {past.length > 0 ? (
        <View className="gap-3">
          <Text variant="heading">{t('visits.pastTitle')}</Text>
          {past.map((v) => (
            <VisitCard key={v.id} visit={v} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

function AddToCalendar({ visit, name }: { visit: Visit; name: string }) {
  const { t } = useTranslation(['caregiver', 'common']);
  const [error, setError] = useState<unknown>(null);

  const add = () => {
    const ics = buildIcs({
      uid: visit.id,
      start: new Date(visit.scheduled_at),
      durationMin: visit.duration_min,
      title: t('visits.calendarTitle', { name }),
      location: visit.location,
      description: t('visits.calendarBody'),
    });
    setError(null);
    saveIcs(
      `kneedit-visit-${visit.scheduled_at.slice(0, 10)}.ics`,
      ics,
      t('visits.addToCalendar'),
    ).catch((e: unknown) => setError(e));
  };

  return (
    <>
      {error ? <Notice tone="error">{t(`common:errors.${errorKey(error)}`)}</Notice> : null}
      <Button
        label={t('visits.addToCalendar')}
        variant="secondary"
        fullWidth
        accessibilityHint={t('visits.addToCalendarHint')}
        onPress={add}
      />
    </>
  );
}
