import { HOME, availableRoles, pickRole } from '@/lib/auth/roles';

const link = (role: 'caregiver' | 'physio', status: 'pending' | 'active' | 'revoked') => ({
  role,
  status,
});

describe('availableRoles', () => {
  it('is empty for a new account, which then goes to onboarding', () => {
    expect(availableRoles({ isSenior: false, links: [], defaultContext: null })).toEqual([]);
  });

  it('gives a senior the senior screens', () => {
    expect(availableRoles({ isSenior: true, links: [], defaultContext: 'senior' })).toEqual([
      'senior',
    ]);
  });

  it('gives a new caregiver or physio their screens before any link exists', () => {
    expect(availableRoles({ isSenior: false, links: [], defaultContext: 'caregiver' })).toEqual([
      'caregiver',
    ]);
    expect(availableRoles({ isSenior: false, links: [], defaultContext: 'physio' })).toEqual([
      'physio',
    ]);
  });

  it('adds a role for each pending or active link, but not a revoked one', () => {
    expect(
      availableRoles({
        isSenior: true,
        links: [link('caregiver', 'pending'), link('physio', 'revoked')],
        defaultContext: 'senior',
      }),
    ).toEqual(['senior', 'caregiver']);
  });

  it('never makes someone a senior because of a setting', () => {
    expect(availableRoles({ isSenior: false, links: [], defaultContext: 'senior' })).toEqual([]);
  });
});

describe('pickRole', () => {
  it('keeps the role picked on this device while it is available', () => {
    expect(pickRole(['senior', 'caregiver'], 'caregiver', 'senior')).toBe('caregiver');
  });

  it('falls back to the onboarding choice, then the first role', () => {
    expect(pickRole(['senior', 'caregiver'], 'physio', 'caregiver')).toBe('caregiver');
    expect(pickRole(['caregiver'], null, 'senior')).toBe('caregiver');
  });

  it('is null before onboarding', () => {
    expect(pickRole([], 'senior', null)).toBeNull();
  });

  it('has a home screen for every role', () => {
    expect(Object.keys(HOME).sort()).toEqual(['caregiver', 'physio', 'senior']);
  });
});
