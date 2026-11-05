import { Redirect } from 'expo-router';

import { LoadingScreen, RequireMe, RequireSignedIn } from '@/components/shared/Guards';
import { HOME } from '@/lib/auth/roles';
import { usePendingLinkCode } from '@/lib/linking/usePendingLinkCode';
import { useActiveRole } from '@/lib/queries/me';

/**
 * Sends everyone to the right place: welcome, onboarding, or their role's
 * home. Someone who signed in after scanning a senior's QR goes on to link
 * to that senior (via caregiver setup if the account is new).
 */
export default function Index() {
  return (
    <RequireSignedIn>
      <RequireMe>
        <ToHome />
      </RequireMe>
    </RequireSignedIn>
  );
}

function ToHome() {
  const role = useActiveRole();
  const pendingCode = usePendingLinkCode();

  if (pendingCode === undefined) return <LoadingScreen />;
  if (pendingCode) {
    if (!role) {
      return <Redirect href={{ pathname: '/onboarding/name', params: { role: 'caregiver' } }} />;
    }
    return <Redirect href={{ pathname: '/link-senior', params: { code: pendingCode } }} />;
  }
  if (!role) return <Redirect href="/onboarding" />;
  return <Redirect href={HOME[role]} />;
}
