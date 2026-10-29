import { View } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';

import { colors } from '@/lib/theme/tokens';

const WIDTH = 300;
const HEIGHT = 100;
/** The chart's top: a knee bent to 120 degrees. */
const MAX_DEG = 120;

/**
 * A line of recent knee bend readings. Decoration only, hidden from screen
 * readers: the current angle is in text next to it.
 */
export function KneeAngleChart({ angles }: { angles: readonly number[] }) {
  const step = angles.length > 1 ? WIDTH / (angles.length - 1) : WIDTH;
  const points = angles
    .map((deg, i) => {
      const y = HEIGHT - (Math.min(Math.max(deg, 0), MAX_DEG) / MAX_DEG) * HEIGHT;
      return `${(i * step).toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="w-full rounded-2xl border border-primary bg-white p-3"
    >
      <Svg
        width="100%"
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
      >
        <Line x1={0} y1={HEIGHT} x2={WIDTH} y2={HEIGHT} stroke={colors.primary} strokeWidth={2} />
        {angles.length > 1 ? (
          <Polyline points={points} fill="none" stroke={colors.secondary} strokeWidth={4} />
        ) : null}
      </Svg>
    </View>
  );
}
