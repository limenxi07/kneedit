import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { Text } from '@/components/ui/Text';
import { formatCode } from '@/lib/linking/code';
import { useLinkCode, useRegenerateLinkCode } from '@/lib/queries/links';
import { errorKey } from '@/lib/supabase/errors';
import { colors } from '@/lib/theme/tokens';

/**
 * The senior's link code, as text and as a QR code. Family and the
 * physiotherapist enter it to ask to join; nothing is shared until the
 * senior approves.
 */
export function LinkCodeCard() {
  const { t } = useTranslation(['senior', 'common']);
  const code = useLinkCode();
  const regenerate = useRegenerateLinkCode();
  const [confirming, setConfirming] = useState(false);

  return (
    <Card tone="primary">
      <Text variant="subheading">{t('linked.codeTitle')}</Text>
      <Text>{t('linked.codeBody')}</Text>
      {code.isPending ? <Loading /> : null}
      {code.error ? (
        <Notice tone="error">{t(`common:errors.${errorKey(code.error)}`)}</Notice>
      ) : null}
      {code.data ? (
        <>
          <Text
            variant="title"
            accessibilityRole="text"
            accessibilityLabel={t('common:linkCode.spelled', { code: [...code.data].join(' ') })}
            className="text-center tracking-widest"
          >
            {formatCode(code.data)}
          </Text>
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={t('linked.qrLabel')}
            className="items-center self-center rounded-2xl bg-white p-4"
          >
            <QRCode
              value={code.data}
              size={200}
              color={colors.ink}
              backgroundColor={colors.white}
            />
          </View>
        </>
      ) : null}

      {regenerate.error ? (
        <Notice tone="error">{t(`common:errors.${errorKey(regenerate.error)}`)}</Notice>
      ) : null}
      {confirming ? (
        <View className="gap-3">
          <Text>{t('linked.newCodeConfirm')}</Text>
          <Button
            label={t('common:actions.cancel')}
            variant="secondary"
            fullWidth
            onPress={() => setConfirming(false)}
          />
          <Button
            label={t('linked.newCode')}
            disabled={regenerate.isPending}
            onPress={() => regenerate.mutate(undefined, { onSuccess: () => setConfirming(false) })}
          />
        </View>
      ) : (
        <Button
          label={t('linked.newCode')}
          variant="secondary"
          fullWidth
          onPress={() => setConfirming(true)}
        />
      )}
    </Card>
  );
}
