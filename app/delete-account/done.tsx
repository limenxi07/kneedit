import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/lib/auth/useAuth';

/**
 * Delete account, step 3. The account is gone; this signs out on this
 * device only, since there is no session left on the server to end.
 */
export default function Deleted() {
  const { t } = useTranslation();
  const { status, signOut } = useAuth();

  useEffect(() => {
    if (status === 'signedIn') void signOut('local');
  }, [status, signOut]);

  return (
    <Screen>
      <Text variant="title">{t('deleteAccount.done.title')}</Text>
      <Text>{t('deleteAccount.done.body')}</Text>
      <Button label={t('deleteAccount.done.button')} onPress={() => router.replace('/welcome')} />
    </Screen>
  );
}
