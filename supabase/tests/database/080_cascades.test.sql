-- What deleting an account removes (PLAN.md, Account deletion). The
-- delete_my_account() RPC arrives in Phase 3; these tests delete the auth user
-- directly, which is what it will do.

begin;
select * from no_plan();

select tests.build_world();

-- Data for another senior, which must survive.
insert into public.sessions (senior_id, local_date, started_at, ended_at, status)
values (tests.uid('friend'), private.sg_today() - 1, now() - interval '1 day', now() - interval '1 day', 'complete');
select tests.link('friend', 'caregiver', 'caregiver');
insert into public.caregiver_notes (senior_id, author_id, body)
values (tests.uid('friend'), tests.uid('caregiver'), 'A note about Friend.');

create temporary table counts (tbl text, filter text) on commit drop;
insert into counts
select tbl, replace(filter, ':senior', quote_literal(tests.uid('senior')))
from (values
  ('profiles', 'id = :senior'),
  ('seniors', 'profile_id = :senior'),
  ('senior_link_codes', 'senior_id = :senior'),
  ('senior_clinical', 'senior_id = :senior'),
  ('care_links', 'senior_id = :senior'),
  ('friendships', ':senior in (requester_id, addressee_id)'),
  ('prescriptions', 'senior_id = :senior'),
  ('sessions', 'senior_id = :senior'),
  ('daily_activity', 'senior_id = :senior'),
  ('fall_events', 'senior_id = :senior'),
  ('sleeve_devices', 'senior_id = :senior'),
  ('senior_stats', 'senior_id = :senior'),
  ('leaderboard_weeks', 'senior_id = :senior'),
  ('weekly_reports', 'senior_id = :senior'),
  ('caregiver_notes', 'senior_id = :senior'),
  ('visits', 'senior_id = :senior'),
  ('alerts', 'senior_id = :senior'),
  ('nudges', 'senior_id = :senior'),
  ('push_tokens', 'profile_id = :senior')
) as c(tbl, filter);

create function pg_temp.count_rows(tbl text, filter text) returns integer language plpgsql as $$
declare n integer;
begin
  execute format('select count(*) from public.%I where %s', tbl, filter) into n;
  return n;
end;
$$;

select ok(pg_temp.count_rows(tbl, filter) > 0, format('before: the senior has %s', tbl)) from counts;

-- ---------------------------------------------------------------------------
-- Deleting a caregiver: their notes stay, credited to "Former caregiver".
-- ---------------------------------------------------------------------------

delete from auth.users where id = tests.uid('caregiver');
select is((select count(*)::int from public.care_links where member_id = tests.uid('caregiver')), 0,
  'a deleted caregiver''s links are gone');
select is((select count(*)::int from public.caregiver_notes where author_id is null), 2,
  'their notes stay, with no author (Q10)');
select is((select count(*)::int from public.nudges where sender_id is null), 1,
  'their nudges stay, with no sender');

-- ---------------------------------------------------------------------------
-- Deleting a physio: the programme and visits stay, credited to "Former physiotherapist".
-- ---------------------------------------------------------------------------

delete from auth.users where id = tests.uid('physio');
select results_eq(
  $$select physio_id from public.prescriptions where id = tests.uid('prescription')$$,
  $$values (null::uuid)$$,
  'a deleted physio''s programme stays, with no author (Q10)'
);
select results_eq(
  $$select physio_id from public.visits where id = tests.uid('visit')$$,
  $$values (null::uuid)$$,
  'and so do their visits'
);
select is((select count(*)::int from public.visit_summaries where visit_id = tests.uid('visit')), 2,
  'and the visit summaries');

-- ---------------------------------------------------------------------------
-- Deleting the senior removes everything about them.
-- ---------------------------------------------------------------------------

delete from auth.users where id = tests.uid('senior');
select is(pg_temp.count_rows(tbl, filter), 0, format('after: nothing left in %s', tbl)) from counts;
select is((select count(*)::int from public.session_exercises), 0, 'no exercise records left');
select is((select count(*)::int from public.prescription_items), 0, 'no programme items left');
select is((select count(*)::int from public.visit_summaries), 0, 'no visit summaries left');

select is((select count(*)::int from public.sessions where senior_id = tests.uid('friend')), 1,
  'another senior''s sessions are untouched');
select is((select count(*)::int from public.caregiver_notes where senior_id = tests.uid('friend')), 1,
  'and their notes');
select is((select count(*)::int from public.profiles where id = tests.uid('caregiver_pending')), 1,
  'and other accounts');

select * from finish();
rollback;
