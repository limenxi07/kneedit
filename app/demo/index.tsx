import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LoadingScreen, RequireMe } from '@/components/shared/Guards';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { HOME } from '@/lib/auth/roles';
import { signInToDemo } from '@/lib/auth/demoSignIn';
import { useAuth } from '@/lib/auth/useAuth';
import { useMe } from '@/lib/queries/me';
import { errorKey } from '@/lib/supabase/errors';

/**
 * The caregiver demo: scanning the demo QR (/demo/qr) opens this page, which
 * signs the device in to the seeded demo caregiver and opens their Overview
 * with sample data. No account, setup or linking.
 */
export default function Demo() {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'signedOut') return <OpenDemo />;
  return (
    <RequireMe>
      <AlreadySignedIn />
    </RequireMe>
  );
}

function OpenDemo() {
  const { t } = useTranslation(['caregiver', 'common']);
  const { setPreferredRole } = useAuth();
  const [error, setError] = useState<unknown>(null);
  const started = useRef(false);

  const open = useCallback(() => {
    setError(null);
    signInToDemo('caregiver').then(
      async () => {
        await setPreferredRole('caregiver');
        router.replace(HOME.caregiver);
      },
      (e: unknown) => setError(e),
    );
  }, [setPreferredRole]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    open();
  }, [open]);

  return (
    <Screen>
      <Text variant="title">{t('demo.title')}</Text>
      {error ? (
        <>
          <Notice tone="error">{t(`common:errors.${errorKey(error)}`)}</Notice>
          <Button label={t('common:actions.tryAgain')} onPress={open} />
        </>
      ) : (
        <>
          <Text>{t('demo.opening')}</Text>
          <Loading />
        </>
      )}
    </Screen>
  );
}

/** Someone already signed in: the demo account goes on, a real account is asked first. */
function AlreadySignedIn() {
  const { t } = useTranslation(['caregiver', 'common']);
  const { signOut } = useAuth();
  const { data: me } = useMe();
  const [error, setError] = useState<unknown>(null);

  if (me?.profile.is_demo && me.roles.includes('caregiver')) {
    return <Redirect href={HOME.caregiver} />;
  }

  return (
    <Screen>
      <Text variant="title">{t('demo.title')}</Text>
      <Text>{t('demo.signedInBody')}</Text>
      {error ? <Notice tone="error">{t(`common:errors.${errorKey(error)}`)}</Notice> : null}
      <Button
        label={t('demo.signOutAndOpen')}
        // Signing out shows OpenDemo, which opens the demo.
        onPress={() => void signOut(me?.profile.is_demo ? 'local' : 'global').catch(setError)}
      />
      <Button
        label={t('demo.stay')}
        variant="secondary"
        fullWidth
        onPress={() => router.replace('/')}
      />
    </Screen>
  );
}
