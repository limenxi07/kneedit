import { useTranslation } from 'react-i18next';

import { RequireMe, RequireSignedIn } from '@/components/shared/Guards';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAppSettings } from '@/lib/queries/account';
import { useMockSetPlan, useSeniorSummary } from '@/lib/queries/caregiver';
import { useMe } from '@/lib/queries/me';
import { errorKey } from '@/lib/supabase/errors';

/**
 * What Kneedit Plus is, and the mock checkout. Payments aren't live: with
 * the paywall off every Plus feature is unlocked, and the checkout changes
 * nothing. With the paywall on, it switches the plan with no payment taken.
 */
export default function Plus() {
  const { t } = useTranslation();
  const settings = useAppSettings();
  const paywallOn = settings.data?.paywall_enabled ?? false;

  return (
    <Screen>
      <BackButton fallback="/" />
      <Text variant="title">{t('plus.title')}</Text>
      <Text>{t('plus.body')}</Text>
      <Card>
        <Text variant="subheading">{t('plus.includesTitle')}</Text>
        <Text>{t('plus.includes.report')}</Text>
        <Text>{t('plus.includes.falls')}</Text>
        <Text>{t('plus.includes.notes')}</Text>
        <Text>{t('plus.includes.nudges')}</Text>
        <Text>{t('plus.includes.visits')}</Text>
        <Text>{t('plus.includes.physio')}</Text>
      </Card>
      <Card>
        <Text>{t('plus.price')}</Text>
      </Card>
      <Card tone="primary">
        <Text variant="bodyStrong">{t('plus.prototype')}</Text>
        {paywallOn ? null : <Text>{t('plus.unlocked')}</Text>}
      </Card>
      <RequireSignedIn>
        <RequireMe>
          <Checkout />
        </RequireMe>
      </RequireSignedIn>
    </Screen>
  );
}

/** The mock checkout, for the senior's own plan or a linked family member's. */
function Checkout() {
  const { t } = useTranslation();
  const { data: me } = useMe();
  if (!me) return null;
  const seniors = [
    ...(me.senior ? [me.senior.profile_id] : []),
    ...me.memberLinks
      .filter((l) => l.role === 'caregiver' && l.status === 'active')
      .map((l) => l.senior_id),
  ];
  if (seniors.length === 0) return null;
  return (
    <>
      <Text variant="heading">{t('plus.checkoutTitle')}</Text>
      {seniors.map((id) => (
        <PlanRow key={id} seniorId={id} isMe={id === me.senior?.profile_id} />
      ))}
    </>
  );
}

function PlanRow({ seniorId, isMe }: { seniorId: string; isMe: boolean }) {
  const { t } = useTranslation();
  const senior = useSeniorSummary(seniorId);
  const setPlan = useMockSetPlan();
  if (!senior.data) return null;
  const onPlus = senior.data.plan === 'plus';
  const who = isMe ? t('plus.you') : senior.data.name;

  return (
    <Card>
      <Text variant="subheading">{who}</Text>
      <Text>{t(onPlus ? 'plus.onPlus' : 'plus.onFree')}</Text>
      {setPlan.error ? (
        <Notice tone="error">{t(`errors.${errorKey(setPlan.error)}`)}</Notice>
      ) : null}
      {setPlan.data === false ? <Notice>{t('plus.nothingChanged')}</Notice> : null}
      {setPlan.data === true ? (
        <Notice tone="success">{t(onPlus ? 'plus.started' : 'plus.stopped')}</Notice>
      ) : null}
      <Button
        label={t(onPlus ? 'plus.stop' : 'plus.start')}
        variant={onPlus ? 'secondary' : 'primary'}
        fullWidth
        accessibilityHint={t('plus.prototype')}
        disabled={setPlan.isPending}
        onPress={() => setPlan.mutate({ seniorId, plan: onPlus ? 'free' : 'plus' })}
      />
    </Card>
  );
}
