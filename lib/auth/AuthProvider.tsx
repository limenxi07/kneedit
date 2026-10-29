import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import i18n from '@/lib/i18n';
import { isLanguage } from '@/lib/i18n/languages';
import { queryClient } from '@/lib/queries/client';
import { supabase } from '@/lib/supabase/client';

import { isRole, type Role } from './roles';

const ROLE_KEY = 'kneedit.role';

export type AuthState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  session: Session | null;
  /** The role last opened on this device, if any. See pickRole(). */
  preferredRole: Role | null;
  setPreferredRole: (role: Role) => Promise<void>;
  /** `local` skips the server call, for an account that no longer exists. */
  signOut: (scope?: 'global' | 'local') => Promise<void>;
};

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [preferredRole, setPreferred] = useState<Role | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      supabase.auth.getSession().then(({ data }) => data.session),
      AsyncStorage.getItem(ROLE_KEY).catch(() => null),
    ]).then(([s, role]) => {
      if (!active) return;
      setSession(s);
      setPreferred(isRole(role) ? role : null);
      setLoaded(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'SIGNED_OUT') queryClient.clear();
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Copy the language the user picks to their profile, so push messages
  // arrive in it (PLAN.md, Choosing the language).
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    const onChange = async (lng: string) => {
      if (!isLanguage(lng)) return;
      // Best effort: the app works in the new language either way.
      await supabase.from('profiles').update({ locale: lng }).eq('id', userId);
    };
    i18n.on('languageChanged', onChange);
    return () => i18n.off('languageChanged', onChange);
  }, [userId]);

  const setPreferredRole = useCallback(async (role: Role) => {
    setPreferred(role);
    try {
      await AsyncStorage.setItem(ROLE_KEY, role);
    } catch {
      // Not fatal: the choice just won't survive a restart.
    }
  }, []);

  const signOut = useCallback(async (scope: 'global' | 'local' = 'global') => {
    await supabase.auth.signOut({ scope });
    queryClient.clear();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      status: !loaded ? 'loading' : session ? 'signedIn' : 'signedOut',
      session,
      preferredRole,
      setPreferredRole,
      signOut,
    }),
    [loaded, session, preferredRole, setPreferredRole, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
