import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { completeSignIn } from '@/lib/auth/signIn';
import { errorKey } from '@/lib/supabase/errors';

/**
 * Where the magic link and Google sign-in come back to
 * (kneedit://auth/callback, or /auth/callback on the web).
 */
export default function AuthCallback() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const [error, setError] = useState<unknown>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    completeSignIn(params).then(
      () => router.replace('/'),
      (e: unknown) => setError(e),
    );
  }, [params]);

  return (
    <Screen>
      {error ? (
        <>
          <Notice tone="error">{t(`errors.${errorKey(error)}`)}</Notice>
          <Notice>{t('callback.tryCode')}</Notice>
          <Button label={t('callback.back')} onPress={() => router.replace('/welcome')} />
        </>
      ) : (
        <Loading />
      )}
    </Screen>
  );
}
