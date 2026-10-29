-- The "Who can see what" matrix in PLAN.md, cell by cell.
--
-- Every row of the grid is one kind of record about the senior. Each string
-- has one digit per viewer, in this order:
--
--   senior, caregiver, caregiver_pending, caregiver_revoked,
--   physio, physio_pending, friend, stranger
--
-- and the digit is how many of those records the viewer can read. It is
-- checked in three modes: paywall off (the default, so everyone gets Plus),
-- paywall on with the senior on Free, and paywall on with the senior on Plus.

begin;
select * from no_plan();

select tests.build_world();

create temporary table viewers (i integer, viewer text) on commit drop;
insert into viewers values
  (1, 'senior'), (2, 'caregiver'), (3, 'caregiver_pending'), (4, 'caregiver_revoked'),
  (5, 'physio'), (6, 'physio_pending'), (7, 'friend'), (8, 'stranger');

create temporary table grid (name text, tbl text, filter text, off text, free text, plus text)
  on commit drop;
insert into grid
select name, tbl,
  replace(replace(replace(replace(filter,
    ':senior', quote_literal(tests.uid('senior'))),
    ':session', quote_literal(tests.uid('session'))),
    ':prescription', quote_literal(tests.uid('prescription'))),
    ':visit', quote_literal(tests.uid('visit'))),
  off, free, plus
from (values
  ('name',                    'profiles',            'id = :senior',             '11001010', '11001010', '11001010'),
  ('age, gender, sharing',    'seniors',             'profile_id = :senior',     '11001000', '11001000', '11001000'),
  ('link code',               'senior_link_codes',   'senior_id = :senior',      '10000000', '10000000', '10000000'),
  ('clinical details',        'senior_clinical',     'senior_id = :senior',      '10001000', '10001000', '10001000'),
  ('links',                   'care_links',          'senior_id = :senior',      '51111100', '51111100', '51111100'),
  ('friendship rows',         'friendships',         'requester_id = :senior',   '00000000', '00000000', '00000000'),
  ('programme',               'prescriptions',       'senior_id = :senior',      '11001000', '11001000', '11001000'),
  ('programme items',         'prescription_items',  'prescription_id = :prescription', '22002000', '22002000', '22002000'),
  ('session dates, status',   'sessions',            'senior_id = :senior',      '11001000', '10001000', '11001000'),
  ('answers and scores',      'session_exercises',   'session_id = :session',    '22002000', '20000000', '22002000'),
  ('steps',                   'daily_activity',      'senior_id = :senior',      '11001000', '10000000', '11001000'),
  ('possible falls',          'fall_events',         'senior_id = :senior',      '11001000', '10000000', '11001000'),
  ('sleeve',                  'sleeve_devices',      'senior_id = :senior',      '10000000', '10000000', '10000000'),
  ('streak, month sessions',  'senior_stats',        'senior_id = :senior',      '11001000', '11001000', '11001000'),
  ('last week standings',     'leaderboard_weeks',   'senior_id = :senior',      '10000000', '10000000', '10000000'),
  ('weekly reports',          'weekly_reports',      'senior_id = :senior',      '11001000', '10000000', '11001000'),
  ('caregiver notes',         'caregiver_notes',     'senior_id = :senior',      '11001000', '10000000', '11001000'),
  ('visit bookings',          'visits',              'senior_id = :senior',      '11001000', '10001000', '11001000'),
  ('visit summary adherence', 'visit_summaries',     'visit_id = :visit and part = ''adherence''', '10001000', '10001000', '10001000'),
  ('visit summary details',   'visit_summaries',     'visit_id = :visit and part = ''details''',   '10001000', '10000000', '10001000'),
  ('missed days alerts',      'alerts',              'senior_id = :senior and kind = ''missed_days''',   '11000000', '10000000', '11000000'),
  ('possible fall alerts',    'alerts',              'senior_id = :senior and kind = ''possible_fall''', '11000000', '10000000', '11000000'),
  ('nudges',                  'nudges',              'senior_id = :senior',      '11000000', '10000000', '11000000'),
  ('push tokens',             'push_tokens',         'profile_id = :senior',     '10000000', '10000000', '10000000')
) as g(name, tbl, filter, off, free, plus);

-- Paywall off: every feature is unlocked.
select is(
  tests.rows_visible(v.viewer, g.tbl, g.filter),
  substr(g.off, v.i, 1)::integer,
  format('paywall off: %s sees %s of %s', v.viewer, substr(g.off, v.i, 1), g.name)
)
from grid g cross join viewers v order by g.name, v.i;

-- Paywall on, senior on Free.
select tests.set_paywall(true);
select is(
  tests.rows_visible(v.viewer, g.tbl, g.filter),
  substr(g.free, v.i, 1)::integer,
  format('paywall on, Free: %s sees %s of %s', v.viewer, substr(g.free, v.i, 1), g.name)
)
from grid g cross join viewers v order by g.name, v.i;

-- Paywall on, senior on Plus.
update public.seniors set plan = 'plus' where profile_id = tests.uid('senior');
select is(
  tests.rows_visible(v.viewer, g.tbl, g.filter),
  substr(g.plus, v.i, 1)::integer,
  format('paywall on, Plus: %s sees %s of %s', v.viewer, substr(g.plus, v.i, 1), g.name)
)
from grid g cross join viewers v order by g.name, v.i;

-- The senior turns off the weekly report and fall notifications. Caregivers
-- lose the report and falls; the physio keeps them (Q6).
select tests.set_paywall(false);
update public.seniors set plan = 'free', share_weekly_report = false, share_fall_alerts = false
where profile_id = tests.uid('senior');

create temporary table sharing_off (name text, expected text) on commit drop;
insert into sharing_off values
  ('session dates, status', '10001000'),
  ('answers and scores',    '20002000'),
  ('steps',                 '10001000'),
  ('possible falls',        '10001000'),
  ('weekly reports',        '10001000'),
  ('missed days alerts',    '11000000'),
  ('possible fall alerts',  '10000000'),
  ('streak, month sessions', '11001000'),
  ('caregiver notes',       '11001000'),
  ('visit bookings',        '11001000');

select is(
  tests.rows_visible(v.viewer, g.tbl, g.filter),
  substr(s.expected, v.i, 1)::integer,
  format('sharing off: %s sees %s of %s', v.viewer, substr(s.expected, v.i, 1), g.name)
)
from sharing_off s join grid g using (name) cross join viewers v order by g.name, v.i;

-- Profiles the other way round: who the senior and the care team can name.
select is(tests.rows_visible('senior', 'profiles', format('id = %L', tests.uid('caregiver_pending'))), 1,
  'the senior sees who is asking to link');
select is(tests.rows_visible('senior', 'profiles', format('id = %L', tests.uid('caregiver_revoked'))), 0,
  'the senior no longer sees a removed caregiver');
select is(tests.rows_visible('physio', 'profiles', format('id = %L', tests.uid('caregiver'))), 1,
  'the care team sees each other');
select is(tests.rows_visible('caregiver', 'profiles', format('id = %L', tests.uid('physio_pending'))), 0,
  'the care team does not see pending members');
select is(tests.rows_visible('friend', 'profiles', format('id = %L', tests.uid('caregiver'))), 0,
  'a friend does not see the care team');
select is(tests.rows_visible('stranger', 'seniors', 'true'), 1,
  'a stranger sees only their own senior record');

-- Revoking takes effect at once.
update public.care_links set status = 'revoked', revoked_at = now()
where member_id = tests.uid('caregiver');
select is(tests.rows_visible('caregiver', 'senior_stats', format('senior_id = %L', tests.uid('senior'))), 0,
  'a caregiver loses access the moment the link is revoked');

select * from finish();
rollback;
