import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/lib/auth/useAuth';
import { normalizeCode } from '@/lib/linking/code';
import { supabase, type Tables } from '@/lib/supabase/client';

export type NamedLink = Tables<'care_links'> & { name: string };

const keys = {
  all: ['links'] as const,
  mine: (userId: string) => ['links', 'senior', userId] as const,
  code: (userId: string) => ['links', 'code', userId] as const,
  members: (userId: string) => ['links', 'member', userId] as const,
};

/** Display names for a set of profiles the caller may see (RLS decides). */
async function namesFor(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.from('profiles').select('id, display_name').in('id', ids);
  if (error) throw error;
  return new Map(data.map((p) => [p.id, p.display_name]));
}

/** For a senior: everyone asking for, or holding, a link to them. */
export function useMyCareTeam() {
  const userId = useUserId();
  return useQuery({
    queryKey: keys.mine(userId),
    queryFn: async (): Promise<NamedLink[]> => {
      const { data, error } = await supabase
        .from('care_links')
        .select('*')
        .eq('senior_id', userId)
        .neq('status', 'revoked')
        .order('requested_at');
      if (error) throw error;
      const names = await namesFor(data.map((l) => l.member_id));
      return data.map((l) => ({ ...l, name: names.get(l.member_id) ?? '' }));
    },
  });
}

/**
 * For a caregiver or physio: their links. Seniors are named only once the
 * link is active; a pending request reveals nothing about the senior.
 */
export function useMyLinksAsMember(role: 'caregiver' | 'physio') {
  const userId = useUserId();
  return useQuery({
    queryKey: [...keys.members(userId), role],
    queryFn: async (): Promise<NamedLink[]> => {
      const { data, error } = await supabase
        .from('care_links')
        .select('*')
        .eq('member_id', userId)
        .eq('role', role)
        .neq('status', 'revoked')
        .order('requested_at');
      if (error) throw error;
      const names = await namesFor(
        data.filter((l) => l.status === 'active').map((l) => l.senior_id),
      );
      return data.map((l) => ({ ...l, name: names.get(l.senior_id) ?? '' }));
    },
  });
}

export function useLinkCode() {
  const userId = useUserId();
  return useQuery({
    queryKey: keys.code(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('senior_link_codes')
        .select('code')
        .eq('senior_id', userId)
        .single();
      if (error) throw error;
      return data.code;
    },
  });
}

/** Refetch links and the account, since links decide roles. */
function useInvalidateLinks() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: keys.all }),
      client.invalidateQueries({ queryKey: ['me'] }),
    ]);
}

export function useRegenerateLinkCode() {
  const invalidate = useInvalidateLinks();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('regenerate_link_code');
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useRedeemLinkCode(role: 'caregiver' | 'physio') {
  const invalidate = useInvalidateLinks();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('redeem_link_code', {
        p_code: normalizeCode(code),
        p_role: role,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useRespondToLink() {
  const invalidate = useInvalidateLinks();
  return useMutation({
    mutationFn: async ({ linkId, accept }: { linkId: string; accept: boolean }) => {
      const { error } = await supabase.rpc('respond_to_link', { p_link: linkId, p_accept: accept });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Either end ends a link, or the requester cancels a pending request. */
export function useRevokeLink() {
  const invalidate = useInvalidateLinks();
  return useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.rpc('revoke_link', { p_link: linkId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
