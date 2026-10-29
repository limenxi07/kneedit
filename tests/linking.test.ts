import fs from 'node:fs';
import path from 'node:path';

import { CONFIRMATION_WORD, matchesConfirmation } from '@/lib/account/deletion';
import { codeFromScan, formatCode, isCompleteCode, normalizeCode } from '@/lib/linking/code';

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
