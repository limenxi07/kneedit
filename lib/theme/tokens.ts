/**
 * Brand tokens, shared by tailwind.config.ts and any code that needs a raw
 * value (status bar, video background, SVG strokes).
 *
 * Contrast rules (brief section 8):
 * - All text is ink. The one exception is the label on an ink-filled (or
 *   danger-filled) button, which is white.
 * - primary, pink and surface are backgrounds; ink on them passes AA.
 * - secondary (muted blue) and mauve are never used for text, and never as
 *   the background behind body text: ink on them is about 4:1, below AA.
 *   Use them for bars, rings, borders and decoration only.
 */
export const colors = {
  ink: '#394955',
  primary: '#D1E2F1',
  secondary: '#8AB0CD',
  pink: '#F5D8E7',
  mauve: '#BDA1B0',
  surface: '#F7FAFD',
  white: '#FFFFFF',
  /** Destructive actions such as Delete account. White on it is over 7:1. */
  danger: '#A4262C',
} as const;

/**
 * Type scale in points. Nothing goes below 16, body text is 18, and the
 * system font size setting is always respected (never set allowFontScaling
 * to false).
 */
export const fontSize = {
  sm: 16,
  base: 18,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 34,
} as const;

/** Minimum touch target in points. */
export const minTapTarget = 56;
