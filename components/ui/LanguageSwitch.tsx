import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';
import { LANGUAGES } from '@/lib/i18n/languages';
import { useLanguage } from '@/lib/i18n/useLanguage';

import { Text } from './Text';

/** Two large buttons, each labelled in its own language. */
export function LanguageSwitch() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('language.label')} className="gap-2">
      <Text variant="bodyStrong">{t('language.label')}</Text>
      <View className="flex-row gap-3">
        {LANGUAGES.map((l) => {
          const selected = l === language;
          return (
            <Pressable
              key={l}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={t(`language.${l}`)}
              onPress={() => void setLanguage(l)}
              className={cn(
                'min-h-tap flex-1 items-center justify-center rounded-2xl border-2 px-4 active:opacity-80',
                selected ? 'border-ink bg-ink' : 'border-ink bg-white',
              )}
            >
              <Text variant="bodyStrong" tone={selected ? 'onDark' : 'ink'}>
                {t(`language.${l}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
