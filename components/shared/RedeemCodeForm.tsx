import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextField } from '@/components/ui/TextField';
import { isCompleteCode } from '@/lib/linking/code';
import { useRedeemLinkCode } from '@/lib/queries/links';
import { errorKey } from '@/lib/supabase/errors';

import { CAN_SCAN, QrScanner } from './QrScanner';

type Props = {
  role: 'caregiver' | 'physio';
  /** A code from a link, filled in for the user to check. */
  initialCode?: string;
  onSent: () => void;
};

/** Type or scan a senior's link code to ask to join their care team. */
export function RedeemCodeForm({ role, initialCode = '', onSent }: Props) {
  const { t } = useTranslation();
  const [code, setCode] = useState(initialCode);
  const [scanning, setScanning] = useState(false);
  const redeem = useRedeemLinkCode(role);

  const submit = (value: string) =>
    redeem.mutate(value, {
      onSuccess: () => {
        setCode('');
        onSent();
      },
    });

  if (scanning) {
    return (
      <QrScanner
        onClose={() => setScanning(false)}
        onCode={(scanned) => {
          setScanning(false);
          setCode(scanned);
          submit(scanned);
        }}
      />
    );
  }

  return (
    <View className="gap-4">
      <TextField
        label={t('linkCode.fieldLabel')}
        hint={t('linkCode.fieldHint')}
        value={code}
        onChangeText={(v) => {
          setCode(v);
          redeem.reset();
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        maxLength={9}
        large
        onSubmitEditing={() => isCompleteCode(code) && submit(code)}
      />
      {redeem.error ? <Notice tone="error">{t(`errors.${errorKey(redeem.error)}`)}</Notice> : null}
      <Button
        label={redeem.isPending ? t('status.sending') : t('linkCode.send')}
        disabled={!isCompleteCode(code) || redeem.isPending}
        onPress={() => submit(code)}
      />
      {CAN_SCAN ? (
        <Button
          label={t('scan.start')}
          variant="secondary"
          fullWidth
          onPress={() => setScanning(true)}
        />
      ) : null}
    </View>
  );
}
