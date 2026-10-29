import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Disclaimer } from '@/components/shared/Disclaimer';
import { RequireSignedOut } from '@/components/shared/Guards';
import { Button } from '@/components/ui/Button';
import { LanguageSwitch } from '@/components/ui/LanguageSwitch';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { sendSignInCode, signInWithGoogle } from '@/lib/auth/signIn';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { errorKey } from '@/lib/supabase/errors';

const looksLikeEmail = (s: string) => /^\S+@\S+\.\S+$/.test(s.trim());

/** Language first, then sign in or create an account with an email code or Google. */
export default function Welcome() {
  return (
    <RequireSignedOut>
      <WelcomeForm />
    </RequireSignedOut>
  );
}

function WelcomeForm() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<'email' | 'google' | null>(null);
  const [error, setError] = useState<unknown>(null);

  const sendCode = async () => {
    setBusy('email');
    setError(null);
    try {
      await sendSignInCode(email, language);
      router.push({ pathname: '/verify', params: { email: email.trim() } });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  };

  const google = async () => {
    setBusy('google');
    setError(null);
    try {
      if (await signInWithGoogle()) router.replace('/');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <Text variant="title">{t('welcome.title')}</Text>
      <Text>{t('app.tagline')}</Text>

      <LanguageSwitch />

      <View className="gap-4">
        <Text variant="subheading">{t('welcome.signInTitle')}</Text>
        <Text>{t('welcome.signInBody')}</Text>
        <TextField
          label={t('welcome.emailLabel')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          inputMode="email"
          onSubmitEditing={() => looksLikeEmail(email) && void sendCode()}
        />
        {error ? <Notice tone="error">{t(`errors.${errorKey(error)}`)}</Notice> : null}
        <Button
          label={busy === 'email' ? t('status.sending') : t('welcome.sendCode')}
          disabled={!looksLikeEmail(email) || busy !== null}
          onPress={() => void sendCode()}
        />
        <Text className="text-center">{t('welcome.or')}</Text>
        <Button
          label={t('welcome.google')}
          variant="secondary"
          fullWidth
          disabled={busy !== null}
          onPress={() => void google()}
        />
      </View>

      <Disclaimer />
    </Screen>
  );
}
