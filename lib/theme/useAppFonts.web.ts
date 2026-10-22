import './fonts.web';

/** Web fonts load through a stylesheet with font-display: swap, so nothing waits. */
export function useAppFonts(): boolean {
  return true;
}
