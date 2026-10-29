import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { LanguageSwitch } from '@/components/ui/LanguageSwitch';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

const CHOICES = [
  { key: 'senior', href: '/onboarding/senior' },
  { key: 'caregiver', href: { pathname: '/onboarding/name', params: { role: 'caregiver' } } },
  { key: 'physio', href: { pathname: '/onboarding/name', params: { role: 'physio' } } },
] as const satisfies readonly { key: string; href: Href }[];

/** "How will you use Kneedit?" after the first sign-in. */
export default function ChooseRole() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Text variant="title">{t('onboarding.roleTitle')}</Text>
      {CHOICES.map((c) => (
        <Pressable
          key={c.key}
          accessibilityRole="button"
          accessibilityLabel={t(`onboarding.role.${c.key}.title`)}
          accessibilityHint={t(`onboarding.role.${c.key}.body`)}
          onPress={() => router.push(c.href)}
          className="min-h-tap gap-1 rounded-3xl border-2 border-ink bg-white p-5 active:opacity-80"
        >
          <Text variant="subheading">{t(`onboarding.role.${c.key}.title`)}</Text>
          <Text>{t(`onboarding.role.${c.key}.body`)}</Text>
        </Pressable>
      ))}
      <LanguageSwitch />
    </Screen>
  );
}
