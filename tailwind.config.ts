import type { Config } from 'tailwindcss';

import { colors, fontSize, minTapTarget } from './lib/theme/tokens';

const lineHeight = (size: number) => `${Math.round(size * 1.4)}px`;

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // The app is light-only. 'class' also stops NativeWind's web runtime from
  // throwing when a stylesheet (the Google Fonts link) is added to <head>.
  darkMode: 'class',
  theme: {
    // Replace, not extend, so text sizes below 16 can't be used by accident.
    fontSize: Object.fromEntries(
      Object.entries(fontSize).map(([k, v]) => [k, [`${v}px`, lineHeight(v)]]),
    ),
    extend: {
      colors,
      minHeight: { tap: `${minTapTarget}px` },
      minWidth: { tap: `${minTapTarget}px` },
    },
  },
  plugins: [],
} satisfies Config;
