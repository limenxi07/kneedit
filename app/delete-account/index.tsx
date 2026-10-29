import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { RequireMe, RequireSignedIn } from '@/components/shared/Guards';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { needsReauth } from '@/lib/auth/reauth';
import { useAuth } from '@/lib/auth/useAuth';
import { useMyCareTeam } from '@/lib/queries/links';
import { useActiveRole, useMe } from '@/lib/queries/me';

/** Delete account, step 1: what will be deleted, tailored to the account. */
export default function DeleteAccount() {
  return (
    <RequireSignedIn>
      <RequireMe>
        <WhatGoes />
      </RequireMe>
    </RequireSignedIn>
  );
}

function WhatGoes() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data: me } = useMe();
  const role = useActiveRole();
  const width = role === 'physio' ? 'wide' : 'phone';
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (me?.profile.is_demo) {
    return (
      <Screen width={width}>
        <Text variant="title">{t('deleteAccount.title')}</Text>
        <Card tone="primary">
          <Text>{t('deleteAccount.demo')}</Text>
        </Card>
        <Button label={t('actions.back')} onPress={back} />
      </Screen>
    );
  }

  const roles = me?.roles ?? [];
  const next = () =>
    router.push(
      needsReauth(session?.user.last_sign_in_at)
        ? '/delete-account/reauth'
        : '/delete-account/confirm',
    );

  return (
    <Screen width={width}>
      <Text variant="title">{t('deleteAccount.title')}</Text>
      <Text variant="bodyStrong">{t('deleteAccount.permanent')}</Text>

      {roles.includes('senior') ? <SeniorPart /> : null}
      {roles.includes('caregiver') ? (
        <Card>
          <Text variant="subheading">{t('deleteAccount.caregiver.title')}</Text>
          <Text>{t('deleteAccount.caregiver.links')}</Text>
          <Text>{t('deleteAccount.caregiver.notes')}</Text>
        </Card>
      ) : null}
      {roles.includes('physio') ? (
        <Card>
          <Text variant="subheading">{t('deleteAccount.physio.title')}</Text>
          <Text>{t('deleteAccount.physio.links')}</Text>
          <Text>{t('deleteAccount.physio.records')}</Text>
        </Card>
      ) : null}
      <Card>
        <Text>{t('deleteAccount.profile')}</Text>
      </Card>

      <Button label={t('actions.cancel')} variant="secondary" fullWidth onPress={back} />
      <Button label={t('actions.continue')} onPress={next} />
    </Screen>
  );
}

function SeniorPart() {
  const { t } = useTranslation();
  const { data: team } = useMyCareTeam();
  const linked = team?.filter((l) => l.status === 'active') ?? [];
  return (
    <Card>
      <Text variant="subheading">{t('deleteAccount.senior.title')}</Text>
      <Text>{t('deleteAccount.senior.history')}</Text>
      <Text>{t('deleteAccount.senior.links')}</Text>
      {linked.length > 0 ? (
        <View className="gap-1">
          <Text variant="bodyStrong">{t('deleteAccount.senior.loseAccess')}</Text>
          {linked.map((l) => (
            <Text key={l.id}>{t(`deleteAccount.senior.member.${l.role}`, { name: l.name })}</Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}
