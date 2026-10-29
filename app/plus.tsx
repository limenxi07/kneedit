import { useTranslation } from 'react-i18next';

import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAppSettings } from '@/lib/queries/account';

/**
 * What Kneedit Plus is. Payments aren't live: with the paywall off every
 * Plus feature is unlocked. The mock checkout arrives in Phase 5.
 */
export default function Plus() {
  const { t } = useTranslation();
  const settings = useAppSettings();
  const paywallOn = settings.data?.paywall_enabled ?? false;

  return (
    <Screen>
      <BackButton fallback="/" />
      <Text variant="title">{t('plus.title')}</Text>
      <Text>{t('plus.body')}</Text>
      <Card>
        <Text variant="subheading">{t('plus.includesTitle')}</Text>
        <Text>{t('plus.includes.report')}</Text>
        <Text>{t('plus.includes.falls')}</Text>
        <Text>{t('plus.includes.notes')}</Text>
        <Text>{t('plus.includes.nudges')}</Text>
        <Text>{t('plus.includes.visits')}</Text>
        <Text>{t('plus.includes.physio')}</Text>
      </Card>
      <Card>
        <Text>{t('plus.price')}</Text>
      </Card>
      <Card tone="primary">
        <Text variant="bodyStrong">{t('plus.prototype')}</Text>
        {paywallOn ? null : <Text>{t('plus.unlocked')}</Text>}
      </Card>
    </Screen>
  );
}
