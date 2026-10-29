import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Role } from '@/lib/auth/roles';
import { useUserId } from '@/lib/auth/useAuth';
import type { Language } from '@/lib/i18n/languages';
import { supabase, type Tables } from '@/lib/supabase/client';

import { meKey } from './me';

type SeniorSetup = {
  displayName: string;
  language: Language;
  birthYear: number;
  gender: Tables<'seniors'>['gender'];
  reminderTime: string;
};

/** Onboarding as a senior: name and language, then the senior record. */
export function useBecomeSenior() {
  const client = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: async (s: SeniorSetup) => {
      const profile = await supabase
        .from('profiles')
        .update({
          display_name: s.displayName.trim(),
          locale: s.language,
          default_context: 'senior',
        })
        .eq('id', userId);
      if (profile.error) throw profile.error;
      const senior = await supabase.from('seniors').insert({
        profile_id: userId,
        birth_year: s.birthYear,
        gender: s.gender,
        reminder_time: s.reminderTime,
      });
      if (senior.error) throw senior.error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: meKey(userId) }),
  });
}

/** Onboarding as a caregiver or physio: name, language and first screen. */
export function useSetUpMember() {
  const client = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: async (m: {
      displayName: string;
      language: Language;
      role: Exclude<Role, 'senior'>;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: m.displayName.trim(), locale: m.language, default_context: m.role })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: meKey(userId) }),
  });
}

type Sharing = Partial<
  Pick<Tables<'seniors'>, 'share_weekly_report' | 'share_fall_alerts' | 'show_on_leaderboard'>
>;

export function useUpdateSharing() {
  const client = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: async (change: Sharing) => {
      const { error } = await supabase.from('seniors').update(change).eq('profile_id', userId);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: meKey(userId) }),
  });
}

export function useAppSettings() {
  return useQuery({
    queryKey: ['app_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('*').single();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * Permanently delete the signed-in account. The done screen then signs out
 * on this device (the account, and so its sessions, are already gone).
 */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (confirmation: string) => {
      const { error } = await supabase.rpc('delete_my_account', { p_confirmation: confirmation });
      if (error) throw error;
    },
  });
}
