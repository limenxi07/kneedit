import fs from 'node:fs';
import path from 'node:path';

import { CONFIRMATION_WORD, matchesConfirmation } from '@/lib/account/deletion';
import { codeFromScan, formatCode, isCompleteCode, normalizeCode } from '@/lib/linking/code';
import { linkUrl, SITE_URL } from '@/lib/linking/linkUrl';
import {
  clearPendingLinkCode,
  decodePending,
  encodePending,
  PENDING_MAX_AGE_MS,
  readPendingLinkCode,
  savePendingLinkCode,
} from '@/lib/linking/pendingLinkCode';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('link and friend codes', () => {
  it('accept spaces, dashes and lower case, as people type them', () => {
    expect(normalizeCode(' abc-234 ')).toBe('ABC234');
    expect(isCompleteCode('abc 234')).toBe(true);
  });

  it('reject the wrong length and the look-alikes 0, O, 1 and I', () => {
    expect(isCompleteCode('ABC23')).toBe(false);
    expect(isCompleteCode('ABC2345')).toBe(false);
    for (const c of ['ABC230', 'ABC23O', 'ABC231', 'ABC23I']) expect(isCompleteCode(c)).toBe(false);
  });

  it('read a code from a scanned QR, plain or in a link', () => {
    expect(codeFromScan('ABC234')).toBe('ABC234');
    expect(codeFromScan('https://kneedit.vercel.app/link-senior?code=abc234')).toBe('ABC234');
    expect(codeFromScan('https://example.com')).toBeNull();
  });

  it('show a code in two groups of three', () => {
    expect(formatCode('abc234')).toBe('ABC 234');
  });
});

describe('the link QR', () => {
  it('opens the "Link a family member" screen on the site, with the code', () => {
    expect(linkUrl('abc 234', 'https://kneedit.vercel.app')).toBe(
      'https://kneedit.vercel.app/link-senior?code=ABC234',
    );
    expect(linkUrl('ABC234', 'https://kneedit-git-pr-7.vercel.app/')).toBe(
      'https://kneedit-git-pr-7.vercel.app/link-senior?code=ABC234',
    );
  });

  it('defaults to the production site off the web', () => {
    expect(linkUrl('ABC234')).toBe(`${SITE_URL}/link-senior?code=ABC234`);
  });

  it('can be read back by the in-app scanner', () => {
    expect(codeFromScan(linkUrl('abc234'))).toBe('ABC234');
  });
});

describe('a link code kept through sign-in', () => {
  const now = Date.UTC(2026, 10, 5, 9);

  it('comes back normalised while fresh', () => {
    expect(decodePending(encodePending('abc-234', now), now + 60_000)).toBe('ABC234');
  });

  it('is forgotten after a day', () => {
    expect(decodePending(encodePending('ABC234', now), now + PENDING_MAX_AGE_MS + 1)).toBeNull();
  });

  it('ignores missing, broken or invalid values', () => {
    expect(decodePending(null, now)).toBeNull();
    expect(decodePending('not json', now)).toBeNull();
    expect(decodePending(JSON.stringify({ code: 'ABC230', savedAt: now }), now)).toBeNull();
    expect(decodePending(JSON.stringify({ code: 'ABC234' }), now)).toBeNull();
  });

  it('is saved, read and cleared on the device', async () => {
    await savePendingLinkCode('abc234');
    expect(await readPendingLinkCode()).toBe('ABC234');
    await clearPendingLinkCode();
    expect(await readPendingLinkCode()).toBeNull();
  });

  it('is not saved when the code is incomplete', async () => {
    await savePendingLinkCode('ABC2');
    expect(await readPendingLinkCode()).toBeNull();
  });
});

describe('the account deletion word', () => {
  it('is DELETE in English, in any case and with spaces around it', () => {
    expect(matchesConfirmation(' delete ', 'en')).toBe(true);
    expect(matchesConfirmation('DELETE ME', 'en')).toBe(false);
  });

  it('is the word shown in Chinese', () => {
    expect(matchesConfirmation(CONFIRMATION_WORD['zh-Hans'], 'zh-Hans')).toBe(true);
    expect(matchesConfirmation('DELETE', 'zh-Hans')).toBe(false);
  });

  it('matches what delete_my_account() accepts', () => {
    const sql = require('node:fs').readFileSync(
      require('node:path').join(
        __dirname,
        '../supabase/migrations/20261030000100_delete_account.sql',
      ),
      'utf8',
    ) as string;
    for (const word of Object.values(CONFIRMATION_WORD)) expect(sql).toContain(`'${word}'`);
  });
});
