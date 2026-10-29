import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { PlusBadge } from '@/components/ui/PlusBadge';
import { SampleDataTag } from '@/components/ui/SampleDataTag';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { formatDate, formatNumber, formatTime } from '@/lib/i18n/format';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { useMe } from '@/lib/queries/me';
import { useAlerts, useHasPlus, useSeniorSummary, useSimulateFall } from '@/lib/queries/caregiver';
import type { Tables } from '@/lib/supabase/client';
import { errorKey } from '@/lib/supabase/errors';

/**
 * Alerts (Plus): possible falls, if the senior shares them, and runs of
 * missed days. Demo accounts can simulate a possible fall.
 */
export default function Alerts() {
  const { t } = useTranslation(['caregiver', 'common']);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: me } = useMe();
  const senior = useSeniorSummary(id);
  const hasPlus = useHasPlus(senior.data);
  const alerts = useAlerts(id);
  const simulate = useSimulateFall(id);
  const name = senior.data?.name ?? '';
  const canSimulate = !!me?.profile.is_demo && !!senior.data?.isDemo;

  return (
    <Screen>
      <BackButton fallback={{ pathname: '/family/[id]', params: { id } }} />
      <Text variant="title">{t('alerts.title')}</Text>
      <PlusBadge />
      <Text>{t('alerts.intro', { name })}</Text>
      <Card tone="pink">
        <Text variant="bodyStrong">{t('alerts.notEmergency', { name })}</Text>
      </Card>

      {!hasPlus ? <Notice>{t('member.needsPlus', { name })}</Notice> : null}
      {senior.data && !senior.data.share_fall_alerts ? (
        <Notice>{t('alerts.fallsOff', { name })}</Notice>
      ) : null}

      {alerts.isPending ? <Loading /> : null}
      {alerts.error ? (
        <Notice tone="error">{t(`common:errors.${errorKey(alerts.error)}`)}</Notice>
      ) : null}
      <View className="gap-3">
        {alerts.isSuccess && alerts.data.length === 0 ? <Text>{t('alerts.empty')}</Text> : null}
        {alerts.data?.map((a) => (
          <AlertRow key={a.id} alert={a} />
        ))}
      </View>

      {canSimulate ? (
        <Card>
          <Text variant="subheading">{t('alerts.demoTitle')}</Text>
          <Text>{t('alerts.demoBody')}</Text>
          {simulate.error ? (
            <Notice tone="error">{t(`common:errors.${errorKey(simulate.error)}`)}</Notice>
          ) : null}
          <Button
            label={t('alerts.simulate')}
            variant="secondary"
            fullWidth
            disabled={simulate.isPending}
            onPress={() => simulate.mutate()}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

function AlertRow({ alert }: { alert: Tables<'alerts'> }) {
  const { t } = useTranslation('caregiver');
  const { language } = useLanguage();
  const at = new Date(alert.created_at);
  const details = (alert.details ?? {}) as { days?: unknown };
  const days = typeof details.days === 'number' ? details.days : null;
  return (
    <Card tone={alert.kind === 'possible_fall' ? 'pink' : 'white'}>
      <Text variant="bodyStrong">
        {alert.kind === 'possible_fall'
          ? t('alerts.possibleFall')
          : days
            ? t('alerts.missedDays', { count: days, value: formatNumber(days, language) })
            : t('alerts.missed')}
      </Text>
      {alert.source === 'fake' ? <SampleDataTag /> : null}
      <Text>
        {t('alerts.when', {
          date: formatDate(at, language, { weekday: 'long', day: 'numeric', month: 'long' }),
          time: formatTime(at, language),
        })}
      </Text>
    </Card>
  );
}
