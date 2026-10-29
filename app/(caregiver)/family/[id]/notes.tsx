import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { PlusBadge } from '@/components/ui/PlusBadge';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { formatDate } from '@/lib/i18n/format';
import { useLanguage } from '@/lib/i18n/useLanguage';
import {
  useAddNote,
  useCaregiverNotes,
  useHasPlus,
  useSeniorSummary,
} from '@/lib/queries/caregiver';
import { errorKey } from '@/lib/supabase/errors';

const MAX_LENGTH = 2000;

/** Notes from family for the physiotherapist (Plus). The senior can read them too. */
export default function Notes() {
  const { t } = useTranslation(['caregiver', 'common']);
  const { language } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const senior = useSeniorSummary(id);
  const hasPlus = useHasPlus(senior.data);
  const notes = useCaregiverNotes(id);
  const add = useAddNote(id);
  const [body, setBody] = useState('');
  const name = senior.data?.name ?? '';

  const save = () => add.mutate(body, { onSuccess: () => setBody('') });

  return (
    <Screen>
      <BackButton fallback={{ pathname: '/family/[id]', params: { id } }} />
      <Text variant="title">{t('notes.title')}</Text>
      <PlusBadge />
      <Text>{t('notes.intro', { name })}</Text>

      {!hasPlus ? (
        <Notice>{t('member.needsPlus', { name })}</Notice>
      ) : (
        <Card>
          <TextField
            label={t('notes.fieldLabel')}
            hint={t('notes.fieldHint')}
            value={body}
            onChangeText={(v) => {
              setBody(v);
              add.reset();
            }}
            multiline
            maxLength={MAX_LENGTH}
          />
          {add.error ? (
            <Notice tone="error">{t(`common:errors.${errorKey(add.error)}`)}</Notice>
          ) : null}
          {add.isSuccess ? <Notice tone="success">{t('notes.saved')}</Notice> : null}
          <Button
            label={add.isPending ? t('common:status.saving') : t('notes.save')}
            disabled={body.trim().length === 0 || add.isPending}
            onPress={save}
          />
        </Card>
      )}

      {notes.isPending ? <Loading /> : null}
      {notes.error ? (
        <Notice tone="error">{t(`common:errors.${errorKey(notes.error)}`)}</Notice>
      ) : null}
      <View className="gap-3">
        <Text variant="heading">{t('notes.listTitle')}</Text>
        {notes.isSuccess && notes.data.length === 0 ? <Text>{t('notes.empty')}</Text> : null}
        {notes.data?.map((note) => (
          <Card key={note.id}>
            <Text>{note.body}</Text>
            <Text variant="bodyStrong">
              {t(note.authorName ? 'notes.from' : 'notes.fromFormer', {
                name: note.authorName ?? '',
                date: formatDate(new Date(note.created_at), language),
              })}
            </Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
