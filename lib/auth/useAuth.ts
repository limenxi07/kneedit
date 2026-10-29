import { useContext } from 'react';

import { AuthContext, type AuthState } from './AuthProvider';

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

/** The signed-in user's id. Only call this on screens behind a sign-in guard. */
export function useUserId(): string {
  const { session } = useAuth();
  if (!session) throw new Error('useUserId needs a signed-in user');
  return session.user.id;
}
