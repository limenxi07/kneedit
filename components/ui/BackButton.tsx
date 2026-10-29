import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { Text } from './Text';

/** Back to the previous screen, or to `fallback` when there is none (a fresh web load). */
export function BackButton({ fallback }: { fallback: Href }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('actions.back')}
      onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
      className="min-h-tap min-w-tap justify-center self-start active:opacity-80"
    >
      <Text variant="bodyStrong" className="underline">
        {t('actions.backArrow')}
      </Text>
    </Pressable>
  );
}
