import { Redirect } from 'expo-router';

import { RequireMe, RequireSignedIn } from '@/components/shared/Guards';
import { HOME } from '@/lib/auth/roles';
import { useActiveRole } from '@/lib/queries/me';

/** Sends everyone to the right place: welcome, onboarding, or their role's home. */
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
  if (!role) return <Redirect href="/onboarding" />;
  return <Redirect href={HOME[role]} />;
}
