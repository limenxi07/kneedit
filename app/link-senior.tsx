import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { RequireMe, RequireSignedIn } from '@/components/shared/Guards';
import { RedeemCodeForm } from '@/components/shared/RedeemCodeForm';
import { BackButton } from '@/components/ui/BackButton';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/lib/auth/useAuth';

/**
 * Link a family member as their caregiver, by typing or scanning their code.
 * Open to any signed-in account, so a senior can help a family member too.
 */
export default function LinkSenior() {
  return (
    <RequireSignedIn>
      <RequireMe>
        <LinkSeniorForm />
      </RequireMe>
    </RequireSignedIn>
  );
}

function LinkSeniorForm() {
  const { t } = useTranslation('caregiver');
  const { setPreferredRole } = useAuth();
  const { code } = useLocalSearchParams<{ code?: string }>();

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
