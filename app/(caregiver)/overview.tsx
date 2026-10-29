import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { PendingRequest } from '@/components/shared/PendingRequest';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { SampleDataTag } from '@/components/ui/SampleDataTag';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { formatNumber } from '@/lib/i18n/format';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { useMyLinksAsMember } from '@/lib/queries/links';
import { useSeniorStats } from '@/lib/queries/stats';
import { errorKey } from '@/lib/supabase/errors';

/**
 * The caregiver's family: each linked senior with the free stats, and any
 * request still waiting. The weekly report, notes and nudges arrive in Phase 5.
 */
export default function Overview() {
  const { t } = useTranslation(['caregiver', 'common']);
  const { language } = useLanguage();
  const links = useMyLinksAsMember('caregiver');
  const active = links.data?.filter((l) => l.status === 'active') ?? [];
  const pending = links.data?.filter((l) => l.status === 'pending') ?? [];
  const stats = useSeniorStats(active.map((l) => l.senior_id));

  return (
    <Screen>
      <Text variant="title">{t('overview.title')}</Text>

      {links.isPending ? <Loading /> : null}
      {links.error ? (
        <Notice tone="error">{t(`common:errors.${errorKey(links.error)}`)}</Notice>
      ) : null}

      {links.isSuccess && active.length === 0 && pending.length === 0 ? (
        <Card>
          <Text variant="subheading">{t('overview.emptyTitle')}</Text>
          <Text>{t('overview.emptyBody')}</Text>
        </Card>
      ) : null}

      {active.map((l) => {
        const s = stats.data?.get(l.senior_id);
        return (
          <Card key={l.id}>
            <Text variant="heading">{l.name}</Text>
            {s?.includes_sample_data ? <SampleDataTag /> : null}
            {s ? (
              <View className="gap-1">
                <Text>
                  {t('overview.streak', {
                    count: s.streak,
                    value: formatNumber(s.streak, language),
                  })}
                </Text>
                <Text>
                  {t('overview.monthSessions', {
                    count: s.month_sessions,
                    value: formatNumber(s.month_sessions, language),
                  })}
                </Text>
              </View>
            ) : (
              <Text>{t('overview.noStats', { name: l.name })}</Text>
            )}
          </Card>
        );
      })}

      {pending.map((l) => (
        <PendingRequest key={l.id} link={l} />
      ))}

      <Button label={t('overview.link')} onPress={() => router.push('/link-senior')} />
      <Button
        label={t('overview.account')}
        variant="secondary"
        fullWidth
        onPress={() => router.push('/account')}
      />
    </Screen>
  );
}
