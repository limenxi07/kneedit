import enCaregiver from '@/locales/en/caregiver.json';
import enCommon from '@/locales/en/common.json';
import enPhysio from '@/locales/en/physio.json';
import enSenior from '@/locales/en/senior.json';
import zhCaregiver from '@/locales/zh-Hans/caregiver.json';
import zhCommon from '@/locales/zh-Hans/common.json';
import zhPhysio from '@/locales/zh-Hans/physio.json';
import zhSenior from '@/locales/zh-Hans/senior.json';

import type { Language } from './languages';

/**
 * Every namespace, in both languages. Add a namespace here and in
 * locales/<lang>/; tests/i18n.test.ts checks the two stay in step.
 */
export const resources = {
  en: { common: enCommon, senior: enSenior, caregiver: enCaregiver, physio: enPhysio },
  'zh-Hans': { common: zhCommon, senior: zhSenior, caregiver: zhCaregiver, physio: zhPhysio },
} as const satisfies Record<Language, Record<string, unknown>>;

export const NAMESPACES = Object.keys(resources.en) as (keyof (typeof resources)['en'])[];
export const DEFAULT_NAMESPACE = 'common' as const;
