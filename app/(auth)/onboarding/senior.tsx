import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { ChoiceGroup } from '@/components/ui/ChoiceGroup';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/lib/auth/useAuth';
import { formatTime } from '@/lib/i18n/format';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { useBecomeSenior } from '@/lib/queries/account';
import { useMe } from '@/lib/queries/me';
import type { Tables } from '@/lib/supabase/client';
import { errorKey } from '@/lib/supabase/errors';

type Gender = NonNullable<Tables<'seniors'>['gender']>;
const GENDERS = ['female', 'male', 'prefer_not_to_say'] as const satisfies readonly Gender[];

/** Reminder times on offer; 9:00 is suggested (PLAN.md, senior setup). */
const REMINDER_TIMES = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '12:00',
  '15:00',
  '18:00',
  '20:00',
] as const;
const SUGGESTED_TIME = '09:00';

const thisYear = () => new Date().getFullYear();

/** A time of day shown in the user's language, from "HH:MM". */
function timeLabel(hhmm: string, language: 'en' | 'zh-Hans') {
  // Any date works: formatTime shows Singapore time, so build the instant in it.
  return formatTime(new Date(`2026-01-01T${hhmm}:00+08:00`), language);
}

/** Setting up as a senior: name, birth year, gender and reminder time. */
export default function SeniorSetup() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { setPreferredRole } = useAuth();
  const { data: me } = useMe();
  const become = useBecomeSenior();

  const [name, setName] = useState(me?.profile.display_name ?? '');
  const [birthYear, setBirthYear] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [reminder, setReminder] = useState<string>(SUGGESTED_TIME);

  if (me?.senior) return <Redirect href="/" />;

  const year = Number(birthYear);
  const yearValid = /^\d{4}$/.test(birthYear) && year >= 1900 && year <= thisYear();
  const ready = name.trim().length > 0 && yearValid && gender !== null;

  const save = () => {
    if (!gender) return;
    become.mutate(
      { displayName: name, language, birthYear: year, gender, reminderTime: reminder },
      {
        onSuccess: async () => {
          await setPreferredRole('senior');
          router.replace('/');
        },
      },
    );
  };

  return (
    <Screen>
      <BackButton fallback="/onboarding" />
      <Text variant="title">{t('onboarding.senior.title')}</Text>
      <Text>{t('onboarding.senior.body')}</Text>

      <TextField
        label={t('onboarding.nameLabel')}
        hint={t('onboarding.senior.nameHint')}
        value={name}
        onChangeText={setName}
        autoComplete="name"
        textContentType="name"
        maxLength={80}
      />
      <TextField
        label={t('onboarding.senior.birthYearLabel')}
        hint={t('onboarding.senior.birthYearHint')}
        value={birthYear}
        onChangeText={(v) => setBirthYear(v.replace(/\D/g, ''))}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={4}
      />
      {birthYear.length === 4 && !yearValid ? (
        <Notice tone="error">{t('onboarding.senior.birthYearInvalid')}</Notice>
      ) : null}
      <ChoiceGroup
        label={t('onboarding.senior.genderLabel')}
        value={gender}
        onChange={setGender}
        options={GENDERS.map((g) => ({ value: g, label: t(`gender.${g}`) }))}
      />
      <ChoiceGroup
        label={t('onboarding.senior.reminderLabel')}
        value={reminder}
        onChange={setReminder}
        layout="wrap"
        options={REMINDER_TIMES.map((time) => ({
          value: time,
          label:
            time === SUGGESTED_TIME
              ? t('onboarding.senior.suggested', { time: timeLabel(time, language) })
              : timeLabel(time, language),
        }))}
      />
      <Text>{t('onboarding.senior.reminderHint')}</Text>

      {become.error ? <Notice tone="error">{t(`errors.${errorKey(become.error)}`)}</Notice> : null}
      <Button
        label={become.isPending ? t('status.saving') : t('actions.continue')}
        disabled={!ready || become.isPending}
        onPress={save}
      />
    </Screen>
  );
}
