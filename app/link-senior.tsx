import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LoadingScreen, RequireMe, RequireSignedIn } from '@/components/shared/Guards';
import { RedeemCodeForm } from '@/components/shared/RedeemCodeForm';
import { BackButton } from '@/components/ui/BackButton';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/lib/auth/useAuth';
import { isCompleteCode } from '@/lib/linking/code';
import { clearPendingLinkCode, savePendingLinkCode } from '@/lib/linking/pendingLinkCode';

/**
 * Link a family member as their caregiver, by typing or scanning their code.
 * Open to any signed-in account, so a senior can help a family member too.
 *
 * The senior's QR opens this screen as /link-senior?code=..., often in a
 * phone browser by someone not signed in yet. Their code is kept through
 * sign-in and onboarding (pendingLinkCode), and the home route sends them
 * back here with it.
 */
export default function LinkSenior() {
  const { status } = useAuth();
  const { code } = useLocalSearchParams<{ code?: string }>();

  if (status === 'signedOut' && code && isCompleteCode(code)) {
    return <KeepCodeThenSignIn code={code} />;
  }
  return (
    <RequireSignedIn>
      <RequireMe>
        <LinkSeniorForm />
      </RequireMe>
    </RequireSignedIn>
  );
}

function KeepCodeThenSignIn({ code }: { code: string }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    void savePendingLinkCode(code).finally(() => setSaved(true));
  }, [code]);
  return saved ? <Redirect href="/welcome" /> : <LoadingScreen />;
}

function LinkSeniorForm() {
  const { t } = useTranslation('caregiver');
  const { setPreferredRole } = useAuth();
  const { code } = useLocalSearchParams<{ code?: string }>();

  // The code has arrived; don't send the user back here again.
  useEffect(() => {
    void clearPendingLinkCode();
  }, []);

  return (
    <Screen>
      <BackButton fallback="/" />
      <Text variant="title">{t('link.title')}</Text>
      <Text>{t('link.body')}</Text>
      <RedeemCodeForm
        role="caregiver"
        initialCode={code}
        onSent={() => {
          void setPreferredRole('caregiver');
          router.replace('/link-pending');
        }}
      />
    </Screen>
  );
}
