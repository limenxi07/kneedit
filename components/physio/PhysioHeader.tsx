import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { LanguageSwitch } from '@/components/ui/LanguageSwitch';
import { Text } from '@/components/ui/Text';

/**
 * Language switch and the account menu (sign out, roles, Delete account),
 * across the top of every physio page.
 */
export function PhysioHeader() {
  const { t } = useTranslation('physio');
  return (
    <View className="flex-row flex-wrap items-end justify-between gap-4 border-b-2 border-primary pb-4">
      <Text variant="heading" className="lg:hidden">
        {t('header.title')}
      </Text>
      <View className="flex-row flex-wrap items-end gap-4">
        <View className="w-72">
          <LanguageSwitch />
        </View>
        <Button
          label={t('header.account')}
          variant="secondary"
          onPress={() => router.push('/account')}
        />
      </View>
    </View>
  );
}
