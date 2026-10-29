import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

/** After a caregiver sends a request: what happens next. */
export default function LinkPending() {
  const { t } = useTranslation('caregiver');
  return (
    <Screen>
      <Text variant="title">{t('pending.title')}</Text>
      <Card tone="primary">
        <Text>{t('pending.body')}</Text>
      </Card>
      <Text>{t('pending.private')}</Text>
      <Button label={t('pending.done')} onPress={() => router.replace('/overview')} />
    </Screen>
  );
}
