import { useTranslation } from 'react-i18next';

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChoiceGroup } from '@/components/ui/ChoiceGroup';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { formatTimeOfDay } from '@/lib/i18n/format';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { REMINDERS_SUPPORTED } from '@/lib/notifications/reminder';
import { hhmm, REMINDER_TIMES, SUGGESTED_REMINDER_TIME } from '@/lib/notifications/time';
import {
  isReminderOn,
  useReminderStatus,
  useTurnOffReminder,
  useTurnOnReminder,
} from '@/lib/notifications/useDailyReminder';
import { useMe } from '@/lib/queries/me';
import { useUpdateReminderTime } from '@/lib/queries/senior';
import { errorKey } from '@/lib/supabase/errors';

/** The daily reminder: the time, and whether this phone shows it. */
export default function Reminder() {
  const { t } = useTranslation(['senior', 'common']);
  const { language } = useLanguage();
  const { data: me } = useMe();
  const status = useReminderStatus();
  const update = useUpdateReminderTime();
  const turnOn = useTurnOnReminder();
  const turnOff = useTurnOffReminder();

  const time = me?.senior ? hhmm(me.senior.reminder_time) : SUGGESTED_REMINDER_TIME;
  const on = isReminderOn(status.data);
  const label = (value: string) =>
    value === SUGGESTED_REMINDER_TIME
      ? t('common:onboarding.senior.suggested', { time: formatTimeOfDay(value, language) })
      : formatTimeOfDay(value, language);
  const error = update.error ?? turnOn.error ?? turnOff.error;

  return (
    <Screen>
      <BackButton fallback="/profile" />
      <Text variant="title">{t('reminder.title')}</Text>

      <ChoiceGroup
        label={t('reminder.timeLabel')}
        value={time}
        layout="wrap"
        onChange={(v) => update.mutate(v)}
        options={REMINDER_TIMES.map((v) => ({ value: v, label: label(v) }))}
      />
      {error ? <Notice tone="error">{t(`common:errors.${errorKey(error)}`)}</Notice> : null}

      {!REMINDERS_SUPPORTED ? (
        <Notice>{t('reminder.webOnly')}</Notice>
      ) : status.data ? (
        <Card tone="primary">
          <Text variant="bodyStrong">
            {on ? t('reminder.on', { time: formatTimeOfDay(time, language) }) : t('reminder.off')}
          </Text>
          {status.data.permission === 'denied' ? <Text>{t('reminder.denied')}</Text> : null}
          {on ? (
            <Button
              label={t('reminder.turnOff')}
              variant="secondary"
              fullWidth
              disabled={turnOff.isPending}
              onPress={() => turnOff.mutate()}
            />
          ) : status.data.permission !== 'denied' ? (
            <Button
              label={t('reminder.turnOn')}
              disabled={turnOn.isPending}
              onPress={() => turnOn.mutate()}
            />
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}
