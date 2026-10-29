import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Share, View } from 'react-native';

import { FriendRow } from '@/components/senior/FriendRow';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { formatCode, isCompleteCode } from '@/lib/linking/code';
import {
  useFriendships,
  useRespondToFriendRequest,
  useSendFriendRequest,
} from '@/lib/queries/friends';
import { useMe } from '@/lib/queries/me';
import { errorKey } from '@/lib/supabase/errors';

/**
 * Friends: add by code, share my code, answer requests, remove a friend.
 * The weekly leaderboard joins this screen with the session flow (Phase 4).
 */
export default function Friends() {
  const { t } = useTranslation(['senior', 'common']);
  const { data: me } = useMe();
  const friendships = useFriendships();
  const send = useSendFriendRequest();
  const respond = useRespondToFriendRequest();
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);

  const myCode = me?.senior?.friend_code ?? '';
  const rows = friendships.data ?? [];
  const incoming = rows.filter((f) => f.direction === 'incoming' && f.status === 'pending');
  const friends = rows.filter((f) => f.status === 'accepted');
  const outgoing = rows.filter((f) => f.direction === 'outgoing' && f.status === 'pending');

  const submit = () =>
    send.mutate(code, {
      onSuccess: () => {
        setCode('');
        setSent(true);
      },
    });

  const share = async () => {
    try {
      await Share.share({ message: t('friends.shareMessage', { code: formatCode(myCode) }) });
    } catch {
      // Sharing isn't available everywhere (some browsers); the code is on screen.
    }
  };

  return (
    <Screen>
      <Text variant="title">{t('friends.title')}</Text>
      <Text>{t('friends.intro')}</Text>

      {friendships.isPending ? <Loading /> : null}
      {friendships.error ? (
        <Notice tone="error">{t(`common:errors.${errorKey(friendships.error)}`)}</Notice>
      ) : null}

      {incoming.length > 0 ? (
        <View className="gap-3">
          <Text variant="heading">{t('friends.requestsTitle')}</Text>
          {incoming.map((f) => (
            <Card key={f.friendship_id} tone="pink">
              <Text variant="bodyStrong">{t('friends.requestFrom', { name: f.display_name })}</Text>
              <Button
                label={t('friends.accept')}
                disabled={respond.isPending}
                onPress={() => respond.mutate({ id: f.friendship_id, accept: true })}
              />
              <Button
                label={t('friends.dismiss')}
                variant="secondary"
                fullWidth
                disabled={respond.isPending}
                onPress={() => respond.mutate({ id: f.friendship_id, accept: false })}
              />
            </Card>
          ))}
          {respond.error ? (
            <Notice tone="error">{t(`common:errors.${errorKey(respond.error)}`)}</Notice>
          ) : null}
        </View>
      ) : null}

      <View className="gap-3">
        <Text variant="heading">{t('friends.listTitle')}</Text>
        {friendships.isSuccess && friends.length === 0 ? <Text>{t('friends.empty')}</Text> : null}
        {friends.map((f) => (
          <FriendRow
            key={f.friendship_id}
            friendshipId={f.friendship_id}
            title={f.display_name}
            action="remove"
          />
        ))}
        {outgoing.map((f) => (
          <FriendRow
            key={f.friendship_id}
            friendshipId={f.friendship_id}
            title={t('friends.sentRequest')}
            action="cancel"
          />
        ))}
      </View>

      <Card>
        <Text variant="subheading">{t('friends.addTitle')}</Text>
        <TextField
          label={t('friends.codeLabel')}
          hint={t('friends.codeHint')}
          value={code}
          onChangeText={(v) => {
            setCode(v);
            setSent(false);
            send.reset();
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          maxLength={9}
          large
        />
        {send.error ? (
          <Notice tone="error">{t(`common:errors.${errorKey(send.error)}`)}</Notice>
        ) : null}
        {sent ? <Notice tone="success">{t('friends.sent')}</Notice> : null}
        <Button
          label={send.isPending ? t('common:status.sending') : t('friends.send')}
          disabled={!isCompleteCode(code) || send.isPending}
          onPress={submit}
        />
      </Card>

      {myCode ? (
        <Card tone="primary">
          <Text variant="subheading">{t('friends.myCodeTitle')}</Text>
          <Text
            variant="title"
            className="text-center tracking-widest"
            accessibilityRole="text"
            accessibilityLabel={t('common:linkCode.spelled', { code: [...myCode].join(' ') })}
          >
            {formatCode(myCode)}
          </Text>
          <Text>{t('friends.myCodeBody')}</Text>
          {Platform.OS !== 'web' || typeof navigator.share === 'function' ? (
            <Button label={t('friends.share')} onPress={() => void share()} />
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}
