import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { CareTeamMember } from '@/components/senior/CareTeamMember';
import { LinkCodeCard } from '@/components/senior/LinkCodeCard';
import { BackButton } from '@/components/ui/BackButton';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useMyCareTeam } from '@/lib/queries/links';
import { errorKey } from '@/lib/supabase/errors';

/** Family and physiotherapist: requests to answer, people linked, and my link code. */
export default function LinkedPeople() {
  const { t } = useTranslation(['senior', 'common']);
  const team = useMyCareTeam();
  const links = team.data ?? [];
  const pending = links.filter((l) => l.status === 'pending');
  const active = links.filter((l) => l.status === 'active');
  const physio = active.find((l) => l.role === 'physio');

  return (
    <Screen>
      <BackButton fallback="/profile" />
      <Text variant="title">{t('linked.title')}</Text>
      <Text>{t('linked.intro')}</Text>

      {team.isPending ? <Loading /> : null}
      {team.error ? (
        <Notice tone="error">{t(`common:errors.${errorKey(team.error)}`)}</Notice>
      ) : null}

      {pending.length > 0 ? (
        <View className="gap-3">
          <Text variant="heading">{t('linked.requestsTitle')}</Text>
          {pending.map((l) => (
            <CareTeamMember key={l.id} link={l} currentPhysio={physio?.name} />
          ))}
        </View>
      ) : null}

      <View className="gap-3">
        <Text variant="heading">{t('linked.activeTitle')}</Text>
        {team.isSuccess && active.length === 0 ? <Text>{t('linked.empty')}</Text> : null}
        {active.map((l) => (
          <CareTeamMember key={l.id} link={l} />
        ))}
      </View>

      <LinkCodeCard />
    </Screen>
  );
}
