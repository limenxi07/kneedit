import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AccountActions } from '@/components/shared/AccountActions';
import { Disclaimer } from '@/components/shared/Disclaimer';
import { RoleSwitcher } from '@/components/shared/RoleSwitcher';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LanguageSwitch } from '@/components/ui/LanguageSwitch';
import { Notice } from '@/components/ui/Notice';
import { PlusBadge } from '@/components/ui/PlusBadge';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Toggle } from '@/components/ui/Toggle';
import { formatTimeOfDay } from '@/lib/i18n/format';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { useUpdateSharing } from '@/lib/queries/account';
import { useMyCareTeam } from '@/lib/queries/links';
import { useMe } from '@/lib/queries/me';
import { errorKey } from '@/lib/supabase/errors';

/**
 * Profile: sharing, linked people and friends, the programme, reminder and
 * visits, language, and the account.
 */
export default function Profile() {
  const { t } = useTranslation(['senior', 'common']);
  const { language } = useLanguage();
  const { data: me } = useMe();
  const { data: team } = useMyCareTeam();
  const sharing = useUpdateSharing();
  const senior = me?.senior;
  const requests = team?.filter((l) => l.status === 'pending').length ?? 0;

  return (
    <Screen>
      <Text variant="title">{me?.profile.display_name || t('profile.title')}</Text>

      {senior ? (
        <Card>
          <Text variant="subheading">{t('profile.sharingTitle')}</Text>
          <Text>{t('profile.sharingIntro')}</Text>
          <Toggle
            label={t('profile.shareReport')}
            description={t('profile.shareReportBody')}
            value={senior.share_weekly_report}
            onChange={(v) => sharing.mutate({ share_weekly_report: v })}
            disabled={sharing.isPending}
            badge={<PlusBadge />}
          />
          <Toggle
            label={t('profile.shareFalls')}
            description={t('profile.shareFallsBody')}
            value={senior.share_fall_alerts}
            onChange={(v) => sharing.mutate({ share_fall_alerts: v })}
            disabled={sharing.isPending}
            badge={<PlusBadge />}
          />
          <Toggle
            label={t('profile.leaderboard')}
            description={t('profile.leaderboardBody')}
            value={senior.show_on_leaderboard}
            onChange={(v) => sharing.mutate({ show_on_leaderboard: v })}
            disabled={sharing.isPending}
          />
          {sharing.error ? (
            <Notice tone="error">{t(`common:errors.${errorKey(sharing.error)}`)}</Notice>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <Text variant="subheading">{t('profile.peopleTitle')}</Text>
        {requests > 0 ? (
          <Text variant="bodyStrong">{t('today.linkRequests', { count: requests })}</Text>
        ) : null}
        <Button label={t('profile.linkedPeople')} onPress={() => router.push('/linked-people')} />
        <Button
          label={t('profile.friends')}
          variant="secondary"
          fullWidth
          onPress={() => router.navigate('/friends')}
        />
      </Card>

      <Card>
        <Text variant="subheading">{t('profile.exercisesTitle')}</Text>
        {senior ? (
          <Text>
            {t('profile.reminderAt', { time: formatTimeOfDay(senior.reminder_time, language) })}
          </Text>
        ) : null}
        <Button label={t('profile.programme')} onPress={() => router.push('/my-programme')} />
        <Button
          label={t('profile.reminder')}
          variant="secondary"
          fullWidth
          onPress={() => router.push('/reminder')}
        />
        <Button
          label={t('profile.visits')}
          variant="secondary"
          fullWidth
          onPress={() => router.push('/my-visits')}
        />
      </Card>

      <LanguageSwitch />
      <RoleSwitcher />
      <Disclaimer />
      <AccountActions />
    </Screen>
  );
}
