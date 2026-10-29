import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { VisitCard } from '@/components/shared/VisitCard';
import { BackButton } from '@/components/ui/BackButton';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { splitVisits, useMyVisits } from '@/lib/queries/senior';
import { errorKey } from '@/lib/supabase/errors';

/** Visits with the physiotherapist, read-only. The physio books them. */
export default function MyVisits() {
  const { t } = useTranslation(['senior', 'common']);
  const visits = useMyVisits();
  const { upcoming, past } = splitVisits(visits.data ?? []);

  return (
    <Screen>
      <BackButton fallback="/profile" />
      <Text variant="title">{t('visits.title')}</Text>
      <Text>{t('visits.intro')}</Text>

      {visits.isPending ? <Loading /> : null}
      {visits.error ? (
        <Notice tone="error">{t(`common:errors.${errorKey(visits.error)}`)}</Notice>
      ) : null}

      <View className="gap-3">
        <Text variant="heading">{t('visits.upcomingTitle')}</Text>
        {visits.isSuccess && upcoming.length === 0 ? <Text>{t('visits.noneUpcoming')}</Text> : null}
        {upcoming.map((v) => (
          <VisitCard key={v.id} visit={v} />
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
