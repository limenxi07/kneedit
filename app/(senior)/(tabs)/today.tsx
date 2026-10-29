import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { formatDate } from '@/lib/i18n/format';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { useMyCareTeam } from '@/lib/queries/links';
import { useMe } from '@/lib/queries/me';

/**
 * Today. The plan, progress and Start button arrive with the session flow
 * (Phase 4); for now it greets the senior and points to anything waiting.
 */
export default function Today() {
  const { t } = useTranslation(['senior', 'common']);
  const { language } = useLanguage();
  const { data: me } = useMe();
  const { data: team } = useMyCareTeam();
  const requests = team?.filter((l) => l.status === 'pending').length ?? 0;

  return (
    <Screen>
      <Text variant="title">{t('today.greeting', { name: me?.profile.display_name ?? '' })}</Text>
      <Text>{formatDate(new Date(), language, { dateStyle: 'full' })}</Text>

      {requests > 0 ? (
        <Card tone="pink">
          <Text variant="bodyStrong">{t('today.linkRequests', { count: requests })}</Text>
          <Button label={t('today.review')} onPress={() => router.push('/linked-people')} />
        </Card>
      ) : null}

      <Card>
        <Text variant="subheading">{t('today.planTitle')}</Text>
        <Text>{t('today.planSoon')}</Text>
      </Card>

      <Card tone="pink">
        <Text variant="bodyStrong">{t('common:safety.stopIfPain')}</Text>
      </Card>
    </Screen>
  );
}
