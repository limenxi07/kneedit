import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { HOME, type Role } from '@/lib/auth/roles';
import { useAuth } from '@/lib/auth/useAuth';
import { useActiveRole, useMe } from '@/lib/queries/me';

/**
 * Switch between the parts of Kneedit this account can use, or start one
 * more: doing the exercises, or helping a family member.
 */
export function RoleSwitcher() {
  const { t } = useTranslation();
  const { setPreferredRole } = useAuth();
  const { data: me } = useMe();
  const active = useActiveRole();
  if (!me) return null;

  const others = me.roles.filter((r) => r !== active);
  const open = (role: Role) => {
    void setPreferredRole(role);
    router.replace(HOME[role]);
  };

  return (
    <Card>
      <Text variant="subheading">{t('roles.switchTitle')}</Text>
      {others.map((role) => (
        <Button
          key={role}
          label={t(`roles.open.${role}`)}
          variant="secondary"
          fullWidth
          onPress={() => open(role)}
        />
      ))}
      {!me.roles.includes('caregiver') ? (
        <Button
          label={t('roles.add.caregiver')}
          variant="secondary"
          fullWidth
          onPress={() => router.push('/link-senior')}
        />
      ) : null}
      {!me.roles.includes('senior') ? (
        <Button
          label={t('roles.add.senior')}
          variant="secondary"
          fullWidth
          onPress={() => router.push('/onboarding/senior')}
        />
      ) : null}
    </Card>
  );
}
