import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { RequireSignedOut } from '@/components/shared/Guards';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { sendSignInCode, verifySignInCode } from '@/lib/auth/signIn';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { errorKey } from '@/lib/supabase/errors';

/** Type the 6-digit code from the sign-in email, or tap its link on this phone. */
export default function Verify() {
  return (
    <RequireSignedOut>
      <VerifyForm />
    </RequireSignedOut>
  );
}

function VerifyForm() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [resent, setResent] = useState(false);

  const complete = code.replace(/\s/g, '').length === 6;

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      await verifySignInCode(email, code);
      router.replace('/');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    setResent(false);
    try {
      await sendSignInCode(email, language);
      setResent(true);
    } catch (e) {
      setError(e);
    }
  };

  return (
    <Screen>
      <BackButton fallback="/welcome" />
      <Text variant="title">{t('verify.title')}</Text>
      <Text>{t('verify.body', { email })}</Text>
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
        onSubmitEditing={() => complete && void verify()}
      />
      {error ? <Notice tone="error">{t(`errors.${errorKey(error)}`)}</Notice> : null}
      {resent ? <Notice tone="success">{t('verify.resent')}</Notice> : null}
      <Button
        label={busy ? t('status.signingIn') : t('verify.signIn')}
        disabled={!complete || busy}
        onPress={() => void verify()}
      />
      <Button
        label={t('verify.resend')}
        variant="secondary"
        fullWidth
        onPress={() => void resend()}
      />
      <Button
        label={t('verify.otherEmail')}
        variant="secondary"
        fullWidth
        onPress={() => router.replace('/welcome')}
      />
    </Screen>
  );
}
