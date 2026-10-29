import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { Text } from '@/components/ui/Text';
import { useRemoveFriend } from '@/lib/queries/friends';
import { errorKey } from '@/lib/supabase/errors';

type Props = {
  friendshipId: string;
  title: string;
  /** "Remove" for a friend, "Cancel request" for a request sent. */
  action: 'remove' | 'cancel';
};

/** A friend or a sent request, with a remove action that asks first. */
export function FriendRow({ friendshipId, title, action }: Props) {
  const { t } = useTranslation(['senior', 'common']);
  const remove = useRemoveFriend();
  const [confirming, setConfirming] = useState(false);

  return (
    <Card>
      <Text variant="bodyStrong">{title}</Text>
      {remove.error ? (
        <Notice tone="error">{t(`common:errors.${errorKey(remove.error)}`)}</Notice>
      ) : null}
      {confirming ? (
        <View className="gap-3">
          <Text>{t(`friends.${action}Confirm`, { name: title })}</Text>
          <Button
            label={t('common:actions.cancel')}
            variant="secondary"
            fullWidth
            onPress={() => setConfirming(false)}
          />
          <Button
            label={t(`friends.${action}`)}
            disabled={remove.isPending}
            onPress={() => remove.mutate(friendshipId)}
          />
        </View>
      ) : (
        <Button
          label={t(`friends.${action}`)}
          variant="secondary"
          accessibilityHint={t(`friends.${action}Confirm`, { name: title })}
          onPress={() => setConfirming(true)}
        />
      )}
    </Card>
  );
}
