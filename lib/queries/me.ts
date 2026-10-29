import { useQuery, useQueryClient } from '@tanstack/react-query';

import { availableRoles, pickRole, type Role } from '@/lib/auth/roles';
import { useAuth } from '@/lib/auth/useAuth';
import { supabase, type Tables } from '@/lib/supabase/client';

export type Me = {
  profile: Tables<'profiles'>;
  senior: Tables<'seniors'> | null;
  /** Links where this account is the caregiver or physio, not yet revoked. */
  memberLinks: Tables<'care_links'>[];
  roles: Role[];
};

export const meKey = (userId: string | undefined) => ['me', userId] as const;

async function fetchMe(userId: string): Promise<Me> {
  const [profile, senior, links] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('seniors').select('*').eq('profile_id', userId).maybeSingle(),
    supabase.from('care_links').select('*').eq('member_id', userId).neq('status', 'revoked'),
  ]);
  if (profile.error) throw profile.error;
  if (senior.error) throw senior.error;
  if (links.error) throw links.error;
  return {
    profile: profile.data,
    senior: senior.data,
    memberLinks: links.data,
    roles: availableRoles({
      isSenior: senior.data !== null,
      links: links.data,
      defaultContext: profile.data.default_context,
    }),
  };
}

/** The signed-in account: profile, senior record, links and roles. */
export function useMe() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: meKey(userId),
    queryFn: () => fetchMe(userId!),
    enabled: !!userId,
  });
}

/** The role whose screens are showing, or null before onboarding. */
export function useActiveRole(): Role | null {
  const { preferredRole } = useAuth();
  const { data } = useMe();
  if (!data) return null;
  return pickRole(data.roles, preferredRole, data.profile.default_context);
}

export function useRefreshMe() {
  const client = useQueryClient();
  const { session } = useAuth();
  return () => client.invalidateQueries({ queryKey: meKey(session?.user.id) });
}
