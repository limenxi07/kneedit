import { useTranslation } from 'react-i18next';

import { AccountActions } from '@/components/shared/AccountActions';
import { Disclaimer } from '@/components/shared/Disclaimer';
import { RequireMe, RequireSignedIn } from '@/components/shared/Guards';
import { RoleSwitcher } from '@/components/shared/RoleSwitcher';
import { BackButton } from '@/components/ui/BackButton';
import { LanguageSwitch } from '@/components/ui/LanguageSwitch';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useActiveRole, useMe } from '@/lib/queries/me';

/** Account for caregivers and physios (seniors use Profile): language, roles, sign out, delete. */
export default function Account() {
  return (
    <RequireSignedIn>
      <RequireMe>
        <AccountScreen />
      </RequireMe>
    </RequireSignedIn>
  );
}

function AccountScreen() {
  const { t } = useTranslation();
  const { data: me } = useMe();
  const role = useActiveRole();

  return (
    <Screen width={role === 'physio' ? 'wide' : 'phone'}>
      <BackButton fallback="/" />
      <Text variant="title">{t('account.title')}</Text>
      <Text variant="subheading">{me?.profile.display_name}</Text>
      <LanguageSwitch />
      <RoleSwitcher />
      <Disclaimer />
      <AccountActions />
    </Screen>
  );
}
