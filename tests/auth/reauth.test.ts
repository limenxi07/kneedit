import { needsReauth } from '@/lib/auth/reauth';

const now = new Date('2026-10-30T12:00:00Z');

describe('needsReauth (24 hours, as delete_my_account checks)', () => {
  it('lets a recent sign-in through', () => {
    expect(needsReauth('2026-10-30T11:00:00Z', now)).toBe(false);
    expect(needsReauth('2026-10-29T12:00:01Z', now)).toBe(false);
  });

  it('asks again from 24 hours on', () => {
    expect(needsReauth('2026-10-29T12:00:00Z', now)).toBe(true);
    expect(needsReauth('2026-10-20T08:00:00Z', now)).toBe(true);
  });

  it('asks again when the sign-in time is missing or unreadable', () => {
    expect(needsReauth(null, now)).toBe(true);
    expect(needsReauth(undefined, now)).toBe(true);
    expect(needsReauth('yesterday', now)).toBe(true);
  });
});
