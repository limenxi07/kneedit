import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from './Text';

/** Shown wherever fake data appears (PLAN.md, Data rules). */
export function SampleDataTag() {
  const { t } = useTranslation();
  return (
    <View
      accessible
      accessibilityLabel={t('sampleData.label')}
      className="self-start rounded-full border-2 border-secondary bg-primary px-3 py-0.5"
    >
      <Text variant="small">{t('sampleData.tag')}</Text>
    </View>
  );
}
