-- Test helpers, shared by every file in this folder.
--
-- This file runs first and is committed (no rollback), so the helpers exist
-- for the other files. They live in a `tests` schema that only exists in the
-- local and CI test databases; no migration creates it.
--
-- Each other file runs in its own transaction and rolls back, so they don't
-- see each other's data.

create extension if not exists pgtap with schema extensions;

create schema if not exists tests;
grant usage on schema tests to authenticated;

-- A stable id for a test handle ('senior', 'caregiver' ...).
create or replace function tests.uid(handle text)
returns uuid
language sql
immutable
as $$
  select md5('kneedit-test-' || handle)::uuid;
$$;

create or replace function tests.create_user(handle text, is_demo boolean default false)
returns uuid
language plpgsql
as $$
begin
  insert into auth.users (
    id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  values (
    tests.uid(handle),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    handle || '@kneedit.test',
    jsonb_build_object('is_demo', is_demo),
    jsonb_build_object('display_name', initcap(replace(handle, '_', ' '))),
    now(),
    now()
  );
  return tests.uid(handle);
end;
$$;

-- A user who does the exercises. Their programme started 60 days ago.
create or replace function tests.create_senior(handle text, is_demo boolean default false)
returns uuid
language plpgsql
as $$
begin
  perform tests.create_user(handle, is_demo);
  insert into public.seniors (profile_id, created_at)
  values (tests.uid(handle), now() - interval '60 days');
  return tests.uid(handle);
end;
$$;

create or replace function tests.link(
  senior text,
  member text,
  role public.link_role,
  status public.link_status default 'active'
)
returns uuid
language sql
as $$
  insert into public.care_links (senior_id, member_id, role, status, revoked_at)
  values (
    tests.uid(senior), tests.uid(member), role, status,
    case when status = 'revoked' then now() end
  )
  returning id;
$$;

create or replace function tests.befriend(
  requester text,
  addressee text,
  status public.friendship_status default 'accepted'
)
returns uuid
language sql
as $$
  insert into public.friendships (requester_id, addressee_id, status)
  values (tests.uid(requester), tests.uid(addressee), status)
  returning id;
$$;

-- Act as a signed-in user for the rest of the transaction, or until
-- tests.clear_authentication().
create or replace function tests.authenticate_as(handle text)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', tests.uid(handle), 'role', 'authenticated')::text,
    true
  );
  perform set_config('request.jwt.claim.sub', tests.uid(handle)::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Back to the test runner's own role (it may switch back because the session
-- user is the superuser).
create or replace function tests.clear_authentication()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end;
$$;

-- A senior's current link code or friend code, readable whoever is signed in.
create or replace function tests.link_code(handle text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select code from public.senior_link_codes where senior_id = tests.uid(handle);
$$;

create or replace function tests.friend_code(handle text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select friend_code from public.seniors where profile_id = tests.uid(handle);
$$;

create or replace function tests.set_paywall(enabled boolean)
returns void
language sql
as $$
  update public.app_settings set paywall_enabled = enabled;
$$;

-- How many rows matching `filter` the user can read in a table. A table the
-- user has no privilege on at all counts as 0.
create or replace function tests.rows_visible(handle text, tbl text, filter text)
returns integer
language plpgsql
as $$
declare
  n integer;
begin
  perform tests.authenticate_as(handle);
  begin
    execute format('select count(*) from public.%I where %s', tbl, filter) into n;
  exception when insufficient_privilege then
    n := 0;
  end;
  perform tests.clear_authentication();
  return n;
end;
$$;

-- The standard cast: one senior with a care team, a friend and a stranger,
-- and one record of every kind about the senior.
create or replace function tests.build_world()
returns void
language plpgsql
as $$
begin
  perform tests.create_senior('senior');
  perform tests.create_senior('friend');
  perform tests.create_senior('stranger');
  perform tests.create_user('caregiver');
  perform tests.create_user('caregiver_pending');
  perform tests.create_user('caregiver_revoked');
  perform tests.create_user('physio');
  perform tests.create_user('physio_pending');

  perform tests.link('senior', 'caregiver', 'caregiver');
  perform tests.link('senior', 'caregiver_pending', 'caregiver', 'pending');
  perform tests.link('senior', 'caregiver_revoked', 'caregiver', 'revoked');
  perform tests.link('senior', 'physio', 'physio');
  perform tests.link('senior', 'physio_pending', 'physio', 'pending');
  perform tests.befriend('senior', 'friend');

  insert into public.senior_clinical (senior_id, affected_knee, notes)
  values (tests.uid('senior'), 'left', 'Test notes');

  insert into public.prescriptions (id, senior_id, physio_id, start_date)
  values (tests.uid('prescription'), tests.uid('senior'), tests.uid('physio'), private.sg_today() - 30);
  insert into public.prescription_items (prescription_id, exercise_id, position, reps)
  values
    (tests.uid('prescription'), 'seated-knee-extension', 1, 10),
    (tests.uid('prescription'), 'ankle-pumps', 2, 15);

  insert into public.sessions (id, senior_id, local_date, started_at, ended_at, status)
  values (
    tests.uid('session'), tests.uid('senior'), private.sg_today() - 1,
    now() - interval '1 day', now() - interval '1 day' + interval '20 minutes', 'complete'
  );
  insert into public.session_exercises (session_id, exercise_id, position, reps_target, reps_done, hurt, easy)
  values
    (tests.uid('session'), 'seated-knee-extension', 1, 10, 10, false, true),
    (tests.uid('session'), 'ankle-pumps', 2, 15, 15, true, false);

  insert into public.daily_activity (senior_id, local_date, steps, source)
  values (tests.uid('senior'), private.sg_today() - 1, 4200, 'manual');
  insert into public.fall_events (senior_id, source) values (tests.uid('senior'), 'manual');
  insert into public.sleeve_devices (senior_id, knee, source) values (tests.uid('senior'), 'left', 'manual');

  insert into public.senior_stats (senior_id, as_of_date, week_start, week_done, week_prescribed, week_rate, streak)
  values (
    tests.uid('senior'), private.sg_today(),
    private.sg_today() - (extract(isodow from private.sg_today())::int - 1), 1, 7, 14, 1
  );
  insert into public.leaderboard_weeks (senior_id, week_start, week_rate, streak)
  values (tests.uid('senior'), private.sg_today() - 7 - (extract(isodow from private.sg_today())::int - 1), 50, 3);
  insert into public.weekly_reports (senior_id, week_start, report)
  values (tests.uid('senior'), private.sg_today() - 7 - (extract(isodow from private.sg_today())::int - 1), '{}');

  insert into public.caregiver_notes (senior_id, author_id, body)
  values (tests.uid('senior'), tests.uid('caregiver'), 'Knee seemed stiff on Sunday.');
  insert into public.visits (id, senior_id, physio_id, scheduled_at)
  values (tests.uid('visit'), tests.uid('senior'), tests.uid('physio'), now() + interval '7 days');
  insert into public.visit_summaries (visit_id, part, body)
  values (tests.uid('visit'), 'adherence', '{}'), (tests.uid('visit'), 'details', '{}');
  insert into public.alerts (senior_id, kind, source)
  values (tests.uid('senior'), 'missed_days', 'manual'), (tests.uid('senior'), 'possible_fall', 'manual');
  insert into public.nudges (senior_id, sender_id) values (tests.uid('senior'), tests.uid('caregiver'));
  insert into public.push_tokens (profile_id, token, platform)
  values (tests.uid('senior'), 'ExponentPushToken[senior]', 'ios');
end;
$$;

grant execute on all functions in schema tests to authenticated;

select plan(1);
select has_function('tests', 'build_world', 'test helpers are installed');
select * from finish();
