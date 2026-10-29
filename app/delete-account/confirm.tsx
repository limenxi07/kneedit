import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { RequireSignedIn } from '@/components/shared/Guards';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { CONFIRMATION_WORD, matchesConfirmation } from '@/lib/account/deletion';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { useDeleteAccount } from '@/lib/queries/account';
import { useActiveRole } from '@/lib/queries/me';
import { errorKey, isRpcError } from '@/lib/supabase/errors';

/** Delete account, step 2: type the word shown, then the red button turns on. */
export default function ConfirmDelete() {
  return (
    <RequireSignedIn>
      <ConfirmForm />
    </RequireSignedIn>
  );
}

function ConfirmForm() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const role = useActiveRole();
  const remove = useDeleteAccount();
  const [typed, setTyped] = useState('');
  const word = CONFIRMATION_WORD[language];
  const matches = matchesConfirmation(typed, language);

  const submit = () =>
    remove.mutate(typed, {
      onSuccess: () => router.replace('/delete-account/done'),
      onError: (e) => {
        if (isRpcError(e, 'reauth_required')) router.replace('/delete-account/reauth');
      },
    });

  return (
    <Screen width={role === 'physio' ? 'wide' : 'phone'}>
      <Text variant="title">{t('deleteAccount.confirm.title')}</Text>
      <Text>{t('deleteAccount.confirm.body', { word })}</Text>
      <TextField
        label={t('deleteAccount.confirm.fieldLabel', { word })}
        value={typed}
        onChangeText={(v) => {
          setTyped(v);
          remove.reset();
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        large
      />
      {remove.error ? <Notice tone="error">{t(`errors.${errorKey(remove.error)}`)}</Notice> : null}
      <Button
        label={t('actions.cancel')}
        variant="secondary"
        fullWidth
        onPress={() => router.replace('/')}
      />
      <Button
        label={remove.isPending ? t('status.deleting') : t('deleteAccount.confirm.button')}
        variant="danger"
        disabled={!matches || remove.isPending}
        onPress={submit}
      />
    </Screen>
  );
}
