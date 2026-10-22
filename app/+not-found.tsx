import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Text variant="heading">{t('notFound.title')}</Text>
      <Button label={t('notFound.back')} onPress={() => router.replace('/')} />
    </Screen>
  );
}
