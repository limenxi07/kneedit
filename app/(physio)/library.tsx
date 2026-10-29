import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { PhysioHeader } from '@/components/physio/PhysioHeader';
import { Card } from '@/components/ui/Card';
import { ChoiceGroup } from '@/components/ui/ChoiceGroup';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { formatNumber } from '@/lib/i18n/format';
import { localized, localizedList } from '@/lib/i18n/localized';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { useTags } from '@/lib/queries/physio';
import { useExercises } from '@/lib/queries/programme';
import { errorKey } from '@/lib/supabase/errors';

/** The exercise library, read-only. Every exercise is a draft pending clinician sign-off. */
export default function Library() {
  const { t } = useTranslation(['physio', 'common']);
  const { language } = useLanguage();
  const exercises = useExercises();
  const tags = useTags();
  const [tag, setTag] = useState('all');
  const label = (key: string) =>
    localized(tags.data?.find((g) => g.key === key)?.label, language) || key;
  const shown = [...(exercises.data?.values() ?? [])].filter(
    (e) => e.active && (tag === 'all' || e.focus_tag === tag || e.position_tag === tag),
  );

  return (
    <Screen width="wide">
      <PhysioHeader />
      <Text variant="title">{t('library.title')}</Text>
      <Card tone="pink">
        <Text variant="bodyStrong">{t('programme.draftLabel')}</Text>
      </Card>
      <ChoiceGroup
        label={t('programme.filter')}
        layout="wrap"
        value={tag}
        onChange={setTag}
        options={[
          { value: 'all', label: t('programme.allTags') },
          ...(tags.data ?? []).map((g) => ({ value: g.key, label: localized(g.label, language) })),
        ]}
      />
      {exercises.isPending ? <Loading /> : null}
      {exercises.error ? (
        <Notice tone="error">{t(`common:errors.${errorKey(exercises.error)}`)}</Notice>
      ) : null}
      <View className="gap-4 lg:flex-row lg:flex-wrap">
        {shown.map((e) => (
          <Card key={e.id} className="lg:w-[48%]">
            <Text variant="subheading">{localized(e.name, language)}</Text>
            <Text variant="bodyStrong">
              {t('library.tags', { focus: label(e.focus_tag), position: label(e.position_tag) })}
            </Text>
            <Text>
              {t('programme.defaultReps', {
                count: e.default_reps,
                value: formatNumber(e.default_reps, language),
              })}
            </Text>
            <View className="gap-1">
              {localizedList(e.steps, language).map((s, i) => (
                <Text key={i}>
                  {t('library.step', { number: formatNumber(i + 1, language), text: s })}
                </Text>
              ))}
            </View>
            <Text>{e.video_path ? t('library.hasVideo') : t('library.noVideo')}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
