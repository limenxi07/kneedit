-- Fake data stays on demo accounts, and demo accounts never meet real ones.

begin;
select * from no_plan();

select tests.create_senior('real_senior');
select tests.create_senior('demo_senior', true);
select tests.create_senior('demo_friend', true);
select tests.create_user('real_caregiver');
select tests.create_user('demo_caregiver', true);

select ok((select is_demo from public.profiles where id = tests.uid('demo_senior')),
  'a demo account is marked from its app_metadata');
select ok(not (select is_demo from public.profiles where id = tests.uid('real_senior')),
  'a real account is not');

-- The auth service may set app_metadata after creating the user.
select tests.create_user('late_demo');
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"is_demo": true}'
where id = tests.uid('late_demo');
select ok((select is_demo from public.profiles where id = tests.uid('late_demo')),
  'is_demo follows app_metadata when it is set after sign-up');

-- Fake records.
select lives_ok(
  $$insert into public.sessions (senior_id, local_date, started_at, ended_at, status, source)
    values (tests.uid('demo_senior'), private.sg_today() - 1, now() - interval '1 day', now() - interval '1 day', 'complete', 'fake')$$,
  'a demo senior can have fake sessions'
);
select throws_ok(
  $$insert into public.sessions (senior_id, local_date, started_at, ended_at, status, source)
    values (tests.uid('real_senior'), private.sg_today() - 1, now() - interval '1 day', now() - interval '1 day', 'complete', 'fake')$$,
  'fake_data_for_real_account', 'a real senior can never get fake sessions'
);
insert into public.sessions (id, senior_id, local_date, started_at, ended_at, status)
values (tests.uid('real_session'), tests.uid('real_senior'), private.sg_today() - 1,
  now() - interval '1 day', now() - interval '1 day', 'complete');
select throws_ok(
  format($$insert into public.session_exercises (session_id, exercise_id, position, reps_target, form_score, source)
    values (%L, 'quad-sets', 1, 10, 8, 'fake')$$, tests.uid('real_session')),
  'fake_data_for_real_account', 'or fake exercise records'
);
select throws_ok(
  $$insert into public.daily_activity (senior_id, local_date, steps, source)
    values (tests.uid('real_senior'), private.sg_today(), 5000, 'fake')$$,
  'fake_data_for_real_account', 'or fake steps'
);
select throws_ok(
  $$insert into public.fall_events (senior_id, source) values (tests.uid('real_senior'), 'fake')$$,
  'fake_data_for_real_account', 'or fake falls'
);
select throws_ok(
  $$insert into public.sleeve_devices (senior_id, knee, source) values (tests.uid('real_senior'), 'left', 'fake')$$,
  'fake_data_for_real_account', 'or a fake sleeve'
);
select throws_ok(
  $$insert into public.alerts (senior_id, kind, source) values (tests.uid('real_senior'), 'possible_fall', 'fake')$$,
  'fake_data_for_real_account', 'or fake alerts'
);
insert into public.daily_activity (senior_id, local_date, steps, source)
values (tests.uid('real_senior'), private.sg_today() - 2, 10, 'manual');
select throws_ok(
  $$update public.daily_activity set source = 'fake' where senior_id = tests.uid('real_senior')$$,
  'fake_data_for_real_account', 'and a real record cannot be relabelled fake'
);

-- Links and friendships.
select tests.link_code('demo_senior') as demo_code \gset
select tests.friend_code('demo_senior') as demo_friend_code \gset

select tests.authenticate_as('real_caregiver');
select throws_ok(format('select public.redeem_link_code(%L, %L)', :'demo_code', 'caregiver'), 'demo_mixing',
  'a real caregiver cannot link to a demo senior');
select tests.clear_authentication();
select tests.authenticate_as('demo_caregiver');
select lives_ok(format('select public.redeem_link_code(%L, %L)', :'demo_code', 'caregiver'),
  'a demo caregiver can');
select tests.clear_authentication();

select tests.authenticate_as('real_senior');
select throws_ok(format('select public.send_friend_request(%L)', :'demo_friend_code'), 'demo_mixing',
  'a real senior cannot befriend a demo senior');
select tests.clear_authentication();
select tests.authenticate_as('demo_friend');
select lives_ok(format('select public.send_friend_request(%L)', :'demo_friend_code'),
  'demo seniors can befriend each other');
select tests.clear_authentication();

select * from finish();
rollback;
