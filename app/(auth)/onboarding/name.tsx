import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { HOME } from '@/lib/auth/roles';
import { useAuth } from '@/lib/auth/useAuth';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { readPendingLinkCode } from '@/lib/linking/pendingLinkCode';
import { useSetUpMember } from '@/lib/queries/account';
import { useMe } from '@/lib/queries/me';
import { errorKey } from '@/lib/supabase/errors';

/** Setting up as a caregiver or physio: just a name. */
export default function MemberSetup() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { role: param } = useLocalSearchParams<{ role?: string }>();
  const role = param === 'physio' ? 'physio' : 'caregiver';
  const { setPreferredRole } = useAuth();
  const { data: me } = useMe();
  const setUp = useSetUpMember();
  const [name, setName] = useState(me?.profile.display_name ?? '');

  const save = () =>
    setUp.mutate(
      { displayName: name, language, role },
      {
        onSuccess: async () => {
          await setPreferredRole(role);
          if (role === 'physio') {
            router.replace(HOME.physio);
            return;
          }
          // A code from a scanned QR, if this caregiver arrived that way.
          const code = await readPendingLinkCode();
          router.replace({ pathname: '/link-senior', params: code ? { code } : {} });
        },
      },
    );

  return (
    <Screen width={role === 'physio' ? 'wide' : 'phone'}>
      <BackButton fallback="/onboarding" />
      <Text variant="title">{t(`onboarding.member.title.${role}`)}</Text>
      <TextField
        label={t('onboarding.nameLabel')}
        hint={t(`onboarding.member.nameHint.${role}`)}
        value={name}
        onChangeText={setName}
        autoComplete="name"
        textContentType="name"
        maxLength={80}
        onSubmitEditing={() => name.trim() && save()}
      />
      {setUp.error ? <Notice tone="error">{t(`errors.${errorKey(setUp.error)}`)}</Notice> : null}
      <Button
        label={setUp.isPending ? t('status.saving') : t('actions.continue')}
        disabled={!name.trim() || setUp.isPending}
        onPress={save}
      />
    </Screen>
  );
}
