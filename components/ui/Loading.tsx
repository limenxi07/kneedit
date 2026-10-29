import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/lib/theme/tokens';

import { Text } from './Text';

/** A spinner with "Loading" for screen readers and anyone who can't see motion. */
export function Loading() {
  const { t } = useTranslation();
  return (
    <View accessible accessibilityLabel={t('status.loading')} className="items-center gap-3 py-8">
      <ActivityIndicator size="large" color={colors.ink} />
      <Text>{t('status.loading')}</Text>
    </View>
  );
}
