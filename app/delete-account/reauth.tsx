import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { RequireSignedIn } from '@/components/shared/Guards';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { sendSignInCode, verifySignInCode } from '@/lib/auth/signIn';
import { useAuth } from '@/lib/auth/useAuth';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { useActiveRole } from '@/lib/queries/me';
import { errorKey } from '@/lib/supabase/errors';

/** Before deleting, a sign-in more than 24 hours old is renewed with an email code. */
export default function Reauthenticate() {
  return (
    <RequireSignedIn>
      <ReauthForm />
    </RequireSignedIn>
  );
}

function ReauthForm() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { session } = useAuth();
  const role = useActiveRole();
  const email = session?.user.email ?? '';
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const run = async (step: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await step();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const send = () =>
    run(async () => {
      await sendSignInCode(email, language, { createUser: false });
      setSent(true);
    });

  const verify = () =>
    run(async () => {
      await verifySignInCode(email, code);
      router.replace('/delete-account/confirm');
    });

  return (
    <Screen width={role === 'physio' ? 'wide' : 'phone'}>
      <Text variant="title">{t('deleteAccount.reauth.title')}</Text>
      <Text>{t('deleteAccount.reauth.body', { email })}</Text>
      {error ? <Notice tone="error">{t(`errors.${errorKey(error)}`)}</Notice> : null}
      {sent ? (
        <>
          <TextField
            label={t('verify.codeLabel')}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
            keyboardType="number-pad"
            inputMode="numeric"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            large
          />
          <Button
            label={t('actions.cancel')}
            variant="secondary"
            fullWidth
            onPress={() => router.replace('/')}
          />
          <Button
            label={busy ? t('status.signingIn') : t('actions.continue')}
            disabled={code.length !== 6 || busy}
            onPress={() => void verify()}
          />
        </>
      ) : (
        <>
          <Button
            label={t('actions.cancel')}
            variant="secondary"
            fullWidth
            onPress={() => router.replace('/')}
          />
          <Button
            label={busy ? t('status.sending') : t('deleteAccount.reauth.send')}
            disabled={busy || !email}
            onPress={() => void send()}
          />
        </>
      )}
    </Screen>
  );
}
