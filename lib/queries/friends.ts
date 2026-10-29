import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/lib/auth/useAuth';
import { normalizeCode } from '@/lib/linking/code';
import { supabase } from '@/lib/supabase/client';

const key = (userId: string) => ['friends', userId] as const;

/** Friends and requests, through list_friendships() (the table isn't readable). */
export function useFriendships() {
  const userId = useUserId();
  return useQuery({
    queryKey: key(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_friendships');
      if (error) throw error;
      return data;
    },
  });
}

function useInvalidateFriends() {
  const client = useQueryClient();
  const userId = useUserId();
  return () => client.invalidateQueries({ queryKey: key(userId) });
}

export function useSendFriendRequest() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase.rpc('send_friend_request', {
        p_friend_code: normalizeCode(code),
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useRespondToFriendRequest() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await supabase.rpc('respond_to_friend_request', {
        p_friendship: id,
        p_accept: accept,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Remove a friend, or cancel a request the caller sent. */
export function useRemoveFriend() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('remove_friend', { p_friendship: id });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
