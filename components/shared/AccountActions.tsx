import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { useAuth } from '@/lib/auth/useAuth';
import { errorKey } from '@/lib/supabase/errors';

/** Sign out and Delete account, at the end of Profile and Account. */
export function AccountActions() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const [error, setError] = useState<unknown>(null);

  return (
    <View className="gap-3">
      {error ? <Notice tone="error">{t(`errors.${errorKey(error)}`)}</Notice> : null}
      <Button
        label={t('account.signOut')}
        variant="secondary"
        fullWidth
        onPress={() =>
          signOut().then(
            () => router.replace('/welcome'),
            (e: unknown) => setError(e),
          )
        }
      />
      <Button
        label={t('account.delete')}
        variant="secondary"
        fullWidth
        accessibilityHint={t('account.deleteHint')}
        onPress={() => router.push('/delete-account')}
      />
    </View>
  );
}
