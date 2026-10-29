import { Redirect } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import type { Role } from '@/lib/auth/roles';
import { useAuth } from '@/lib/auth/useAuth';
import { useActiveRole, useMe } from '@/lib/queries/me';
import { errorKey } from '@/lib/supabase/errors';

/**
 * Navigation guards. They only decide which screens show; what anyone can
 * read is enforced in Postgres RLS.
 */

export function LoadingScreen() {
  return (
    <Screen>
      <Loading />
    </Screen>
  );
}

/** Screens for signed-in users. Signed-out users go to the welcome screen. */
export function RequireSignedIn({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'signedOut') return <Redirect href="/welcome" />;
  return children;
}

/** Screens for signed-out users. Signed-in users go to their home screen. */
export function RequireSignedOut({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'signedIn') return <Redirect href="/" />;
  return children;
}

/** The account (profile and roles) has loaded, or show why not. */
export function RequireMe({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const me = useMe();
  if (me.isPending) return <LoadingScreen />;
  if (me.isError) {
    return (
      <Screen>
        <Notice tone="error">{t(`errors.${errorKey(me.error)}`)}</Notice>
        <Button label={t('actions.tryAgain')} onPress={() => void me.refetch()} />
      </Screen>
    );
  }
  return children;
}

/**
 * Screens for one role. Opening one (from a link, say) makes it the active
 * role; an account without the role goes back to its own home.
 */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  return (
    <RequireSignedIn>
      <RequireMe>
        <RoleGate role={role}>{children}</RoleGate>
      </RequireMe>
    </RequireSignedIn>
  );
}

function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const { setPreferredRole } = useAuth();
  const { data: me } = useMe();
  const active = useActiveRole();
  const allowed = !!me?.roles.includes(role);

  useEffect(() => {
    if (allowed && active !== role) void setPreferredRole(role);
  }, [allowed, active, role, setPreferredRole]);

  if (!allowed) return <Redirect href="/" />;
  return children;
}
