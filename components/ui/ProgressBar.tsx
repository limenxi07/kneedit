import { View } from 'react-native';

type Props = {
  /** 0 to 100. */
  value: number;
  /** What the bar measures, read with its value by screen readers. */
  label: string;
};

/** A muted blue bar on a light track. Decoration only: the number is always in text nearby. */
export function ProgressBar({ value, label }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      className="h-4 w-full overflow-hidden rounded-full border border-secondary bg-primary"
    >
      <View className="h-full rounded-full bg-secondary" style={{ width: `${pct}%` }} />
    </View>
  );
}
