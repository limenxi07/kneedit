import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from './Text';

/**
 * Marks a Plus feature. Payments aren't live, so every Plus feature works
 * for everyone; tapping the badge explains Kneedit Plus.
 */
export function PlusBadge() {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('plus.badgeLabel')}
      accessibilityHint={t('plus.badgeHint')}
      onPress={() => router.push('/plus')}
      className="min-h-tap justify-center self-start active:opacity-80"
    >
      <View className="rounded-full border-2 border-mauve bg-pink px-3 py-0.5">
        <Text variant="small">{t('plus.badge')}</Text>
      </View>
    </Pressable>
  );
}
