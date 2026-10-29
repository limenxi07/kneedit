import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

/** No sleeve yet: everyone logs exercises by hand (PLAN.md, SleeveSource). */
export default function Sleeve() {
  const { t } = useTranslation('senior');
  return (
    <Screen>
      <Text variant="title">{t('sleeve.title')}</Text>
      <Card>
        <Text variant="subheading">{t('sleeve.noneTitle')}</Text>
        <Text>{t('sleeve.noneBody')}</Text>
      </Card>
    </Screen>
  );
}
