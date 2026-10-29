import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { SampleDataTag } from '@/components/ui/SampleDataTag';
import { Text } from '@/components/ui/Text';
import { formatNumber, formatPercent } from '@/lib/i18n/format';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { useLeaderboard } from '@/lib/queries/senior';
import { errorKey } from '@/lib/supabase/errors';

/**
 * This week's leaderboard: the senior and friends who show on it, by week %,
 * then streak. Friends see only names, streaks and week %.
 */
export function Leaderboard() {
  const { t } = useTranslation(['senior', 'common']);
  const { language } = useLanguage();
  const board = useLeaderboard();
  const entries = board.data ?? [];

  return (
    <View className="gap-3">
      <Text variant="heading">{t('leaderboard.title')}</Text>
      <Text>{t('leaderboard.rule')}</Text>
      <Text variant="bodyStrong">{t('leaderboard.resets')}</Text>

      {board.isPending ? <Loading /> : null}
      {board.error ? (
        <Notice tone="error">{t(`common:errors.${errorKey(board.error)}`)}</Notice>
      ) : null}

      {entries.map((e, i) => (
        <Card
          key={e.seniorId}
          tone={e.isMe ? 'primary' : 'white'}
          accessible
          accessibilityLabel={t('leaderboard.rowLabel', {
            rank: formatNumber(i + 1, language),
            name: e.isMe ? t('leaderboard.you', { name: e.displayName }) : e.displayName,
            rate: formatPercent(e.weekRate, language),
            streak: t('progress.streak', {
              count: e.streak,
              value: formatNumber(e.streak, language),
            }),
          })}
        >
          <Text variant="bodyStrong">
            {t('leaderboard.rank', {
              rank: formatNumber(i + 1, language),
              name: e.isMe ? t('leaderboard.you', { name: e.displayName }) : e.displayName,
            })}
          </Text>
          {e.includesSampleData ? <SampleDataTag /> : null}
          <Text>
            {t('leaderboard.stats', {
              rate: formatPercent(e.weekRate, language),
              streak: t('progress.streak', {
                count: e.streak,
                value: formatNumber(e.streak, language),
              }),
            })}
          </Text>
        </Card>
      ))}

      {board.isSuccess && entries.length <= 1 ? <Text>{t('leaderboard.empty')}</Text> : null}
    </View>
  );
}
