import { useTranslation } from 'react-i18next';

import { ChoiceGroup } from '@/components/ui/ChoiceGroup';

type Props = {
  label: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
};

/** A question with two large Yes and No buttons. */
export function YesNoQuestion({ label, value, onChange }: Props) {
  const { t } = useTranslation('senior');
  return (
    <ChoiceGroup
      label={label}
      layout="wrap"
      value={value === null ? null : value ? 'yes' : 'no'}
      onChange={(v) => onChange(v === 'yes')}
      options={[
        { value: 'yes', label: t('questions.yes') },
        { value: 'no', label: t('questions.no') },
      ]}
    />
  );
}
