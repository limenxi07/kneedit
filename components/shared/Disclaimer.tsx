import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';

/** Decision 12: the "not a medical device" note. */
export function Disclaimer() {
  const { t } = useTranslation();
  return (
    <Card tone="primary">
      <Text>{t('disclaimer')}</Text>
    </Card>
  );
}
