import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { LanguageSwitch } from '@/components/ui/LanguageSwitch';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

/** Placeholder home until sign-in and role routing arrive in Phase 3. */
export default function Home() {
  const { t } = useTranslation();

  return (
    <Screen>
      <Text variant="title">{t('placeholder.title')}</Text>
      <Text>{t('app.tagline')}</Text>

      <Card tone="primary">
        <Text>{t('placeholder.body')}</Text>
      </Card>

      <Card>
        <Text variant="subheading">{t('placeholder.rolesTitle')}</Text>
        <Text>{t('placeholder.senior')}</Text>
        <Text>{t('placeholder.caregiver')}</Text>
        <Text>{t('placeholder.physio')}</Text>
      </Card>

      <Card tone="pink">
        <Text variant="bodyStrong">{t('safety.stopIfPain')}</Text>
      </Card>

      <LanguageSwitch />
    </Screen>
  );
}
