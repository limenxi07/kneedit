import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChoiceGroup } from '@/components/ui/ChoiceGroup';
import { Notice } from '@/components/ui/Notice';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { isValidDate } from '@/lib/calendar/dateTime';
import { cn } from '@/lib/cn';
import { formatNumber, formatWeekday } from '@/lib/i18n/format';
import { localized } from '@/lib/i18n/localized';
import { useLanguage } from '@/lib/i18n/useLanguage';
import {
  addItem,
  draftFrom,
  moveItem,
  problems,
  removeItem,
  setItem,
  setVariation,
  toRpcItems,
  WEEKDAY_KEYS,
  type Draft,
  type ListKey,
} from '@/lib/prescribe/editor';
import { localDate, type Frequency, type Plan } from '@/lib/progress';
import { useSavePrescription, useTags } from '@/lib/queries/physio';
import type { Exercise } from '@/lib/queries/programme';
import { errorKey } from '@/lib/supabase/errors';

const FREQUENCIES = ['daily', 'twice_daily', 'alternate_days'] as const satisfies Frequency[];

type Props = {
  seniorId: string;
  current: Plan | null;
  exercises: Map<string, Exercise>;
  onSaved: () => void;
};

/**
 * Prescribe: pick from the library (filter by tag), tick to add, order with
 * Move up and Move down, set reps and how often, choose the start date and
 * whether every day is the same. Saving makes a new version from the start
 * date; sessions already started keep their exercises.
 */
export function ProgrammeEditor({ seniorId, current, exercises, onSaved }: Props) {
  const { t } = useTranslation(['physio', 'common']);
  const { language } = useLanguage();
  const today = localDate(new Date());
  const save = useSavePrescription(seniorId);
  const [draft, setDraftState] = useState<Draft>(() => draftFrom(current, today));
  const [day, setDay] = useState<ListKey>('1');
  const [tag, setTag] = useState('all');
  const [tried, setTried] = useState(false);
  const tags = useTags();

  const setDraft = (next: Draft) => setDraftState(next);
  const key: ListKey = draft.variation === 'by_weekday' ? day : 'all';
  const list = draft.lists[key];
  const dateOk = isValidDate(draft.startDate);
  const found = dateOk ? problems(draft, today) : ['badDate' as const];
  const library = [...exercises.values()].filter(
    (e) => e.active && (tag === 'all' || e.focus_tag === tag || e.position_tag === tag),
  );
  const name = (id: string) => localized(exercises.get(id)?.name, language);

  const submit = () => {
    setTried(true);
    if (found.length > 0) return;
    save.mutate(
      { startDate: draft.startDate, variation: draft.variation, items: toRpcItems(draft) },
      { onSuccess: onSaved },
    );
  };

  return (
    <View className="gap-6 lg:flex-row">
      <View className="gap-4 lg:flex-[3]">
        <Card>
          <Text variant="subheading">{t('programme.editTitle')}</Text>
          <TextField
            label={t('programme.startDate')}
            hint={t('programme.startDateHint')}
            value={draft.startDate}
            onChangeText={(v) => setDraft({ ...draft, startDate: v.trim() })}
            autoCorrect={false}
          />
          <ChoiceGroup
            label={t('programme.variation')}
            layout="wrap"
            value={draft.variation}
            onChange={(v) => setDraft(setVariation(draft, v))}
            options={[
              { value: 'same_every_day', label: t('programme.sameEveryDay') },
              { value: 'by_weekday', label: t('programme.byWeekday') },
            ]}
          />
          {draft.variation === 'by_weekday' ? (
            <ChoiceGroup
              label={t('programme.day')}
              layout="wrap"
              value={day}
              onChange={setDay}
              options={WEEKDAY_KEYS.map((d) => ({
                value: d,
                label: t('programme.dayCount', {
                  day: formatWeekday(Number(d), language),
                  count: draft.lists[d].length,
                  value: formatNumber(draft.lists[d].length, language),
                }),
              }))}
            />
          ) : null}
        </Card>

        <Card>
          <Text variant="subheading">
            {draft.variation === 'by_weekday'
              ? t('programme.listForDay', { day: formatWeekday(Number(day), language) })
              : t('programme.listEveryDay')}
          </Text>
          {list.length === 0 ? <Text>{t('programme.emptyList')}</Text> : null}
          {list.map((item, index) => (
            <View
              key={item.exerciseId}
              className="gap-3 rounded-2xl border-2 border-primary bg-white p-4"
            >
              <Text variant="bodyStrong">
                {t('programme.numbered', {
                  number: formatNumber(index + 1, language),
                  name: name(item.exerciseId),
                })}
              </Text>
              <View className="gap-3 lg:flex-row lg:items-start">
                <View className="lg:w-40">
                  <TextField
                    label={t('programme.reps')}
                    value={String(item.reps)}
                    onChangeText={(v) =>
                      setDraft(
                        setItem(draft, key, item.exerciseId, {
                          reps: Number(v.replace(/\D/g, '') || 0),
                        }),
                      )
                    }
                    inputMode="numeric"
                    maxLength={3}
                  />
                </View>
                <View className="lg:flex-1">
                  <ChoiceGroup
                    label={t('programme.frequency')}
                    layout="wrap"
                    value={item.frequency}
                    onChange={(f) =>
                      setDraft(setItem(draft, key, item.exerciseId, { frequency: f }))
                    }
                    options={FREQUENCIES.map((f) => ({
                      value: f,
                      label: t(`programme.frequencies.${f}`),
                    }))}
                  />
                </View>
              </View>
              <View className="flex-row flex-wrap gap-2">
                <Button
                  label={t('programme.moveUp')}
                  variant="secondary"
                  accessibilityHint={name(item.exerciseId)}
                  disabled={index === 0}
                  onPress={() => setDraft(moveItem(draft, key, item.exerciseId, -1))}
                />
                <Button
                  label={t('programme.moveDown')}
                  variant="secondary"
                  accessibilityHint={name(item.exerciseId)}
                  disabled={index === list.length - 1}
                  onPress={() => setDraft(moveItem(draft, key, item.exerciseId, 1))}
                />
                <Button
                  label={t('programme.remove')}
                  variant="secondary"
                  accessibilityHint={name(item.exerciseId)}
                  onPress={() => setDraft(removeItem(draft, key, item.exerciseId))}
                />
              </View>
            </View>
          ))}

          {tried && found.length > 0 ? (
            <Notice tone="error">{found.map((p) => t(`programme.problems.${p}`)).join(' ')}</Notice>
          ) : null}
          {save.error ? (
            <Notice tone="error">{t(`common:errors.${errorKey(save.error)}`)}</Notice>
          ) : null}
          <Text>{t('programme.saveNote')}</Text>
          <Button
            label={save.isPending ? t('common:status.saving') : t('programme.save')}
            disabled={save.isPending}
            onPress={submit}
          />
        </Card>
      </View>

      <Card className="lg:flex-[2] lg:self-start">
        <Text variant="subheading">{t('programme.libraryTitle')}</Text>
        <Text>{t('programme.draftLabel')}</Text>
        <ChoiceGroup
          label={t('programme.filter')}
          layout="wrap"
          value={tag}
          onChange={setTag}
          options={[
            { value: 'all', label: t('programme.allTags') },
            ...(tags.data ?? []).map((g) => ({
              value: g.key,
              label: localized(g.label, language),
            })),
          ]}
        />
        {library.map((e) => {
          const added = list.some((i) => i.exerciseId === e.id);
          return (
            <Pressable
              key={e.id}
              accessibilityRole="checkbox"
              accessibilityLabel={localized(e.name, language)}
              accessibilityState={{ checked: added }}
              onPress={() =>
                setDraft(
                  added ? removeItem(draft, key, e.id) : addItem(draft, key, e.id, e.default_reps),
                )
              }
              className={cn(
                'min-h-tap flex-row items-center gap-3 rounded-2xl border-2 border-ink px-4 py-3 active:opacity-80',
                added ? 'bg-primary' : 'bg-white',
              )}
            >
              <View
                className={cn(
                  'h-7 w-7 items-center justify-center rounded-md border-2 border-ink',
                  added ? 'bg-ink' : 'bg-white',
                )}
              >
                {added ? <View className="h-3 w-3 rounded-sm bg-white" /> : null}
              </View>
              <View className="flex-1">
                <Text variant="bodyStrong">{localized(e.name, language)}</Text>
                <Text>
                  {t('programme.defaultReps', {
                    count: e.default_reps,
                    value: formatNumber(e.default_reps, language),
                  })}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </Card>
    </View>
  );
}
