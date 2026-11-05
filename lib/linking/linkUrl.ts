import { Platform } from 'react-native';

import { normalizeCode } from './code';

/** The production website, where a link QR opens when the app isn't the one showing it. */
export const SITE_URL = 'https://kneedit.vercel.app';

/**
 * The site this copy of the app runs on: the page's own origin on the web (so
 * a preview deploy's QR opens that preview), the production site elsewhere.
 */
export function siteUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return SITE_URL;
}

/**
 * What the senior's link QR holds: a web address that opens the "Link a
 * family member" screen with the code filled in. Any phone camera can open
 * it, no app needed, and the in-app scanner reads the code back out of it
 * (codeFromScan).
 */
export function linkUrl(code: string, site: string = siteUrl()): string {
  // Plain strings: React Native's URL has no working searchParams.
  return `${trim(site)}/link-senior?code=${encodeURIComponent(normalizeCode(code))}`;
}

/** The caregiver demo, which signs a phone in to the demo caregiver with sample data. */
export function demoUrl(site: string = siteUrl()): string {
  return `${trim(site)}/demo`;
}

const trim = (site: string) => site.replace(/\/+$/, '');
