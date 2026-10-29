-- What each role may write, and the integrity rules on records.

begin;
select * from no_plan();

select tests.build_world();

-- ---------------------------------------------------------------------------
-- Profiles and senior records
-- ---------------------------------------------------------------------------

select tests.authenticate_as('senior');

select lives_ok(
  $$update public.profiles set display_name = 'Ah Mei', locale = 'zh-Hans' where id = auth.uid()$$,
  'a user edits their own name and language'
);
select throws_ok(
  $$update public.profiles set is_demo = true where id = auth.uid()$$,
  '42501', null, 'a user cannot make their account a demo account'
);
select lives_ok(
  $$update public.seniors set share_weekly_report = false, reminder_time = '08:00'
    where profile_id = auth.uid()$$,
  'a senior changes their sharing and reminder'
);
select throws_ok(
  $$update public.seniors set plan = 'plus' where profile_id = auth.uid()$$,
  '42501', null, 'a senior cannot change their plan directly'
);
select throws_ok(
  $$update public.seniors set friend_code = 'AAAAAA' where profile_id = auth.uid()$$,
  '42501', null, 'a senior cannot pick their friend code'
);
select throws_ok(
  $$update public.app_settings set paywall_enabled = true$$,
  '42501', null, 'nobody signed in can flip the paywall'
);
select throws_ok(
  $$insert into public.exercises (id, name, steps, default_reps, focus_tag, position_tag)
    values ('x', '{"en": "X", "zh-Hans": "X"}', '{"en": ["x"], "zh-Hans": ["x"]}', 1, 'strength', 'seated')$$,
  '42501', null, 'nobody signed in can change the exercise library'
);
select throws_ok(
  $$insert into public.senior_stats (senior_id, as_of_date, week_start) values (auth.uid(), now(), now())$$,
  '42501', null, 'derived stats are written by server code only'
);

select tests.authenticate_as('caregiver');
update public.seniors set share_fall_alerts = false where profile_id = tests.uid('senior');
select tests.clear_authentication();
select ok(
  (select share_fall_alerts from public.seniors where profile_id = tests.uid('senior')),
  'a caregiver cannot change the senior''s sharing'
);

select tests.authenticate_as('caregiver');
update public.profiles set display_name = 'Hacked' where id = tests.uid('senior');
select tests.clear_authentication();
select isnt(
  (select display_name from public.profiles where id = tests.uid('senior')),
  'Hacked',
  'nobody edits someone else''s profile'
);

select tests.create_user('newcomer');
select tests.authenticate_as('newcomer');
select lives_ok(
  $$insert into public.seniors (profile_id, birth_year, gender) values (auth.uid(), 1952, 'female')$$,
  'a new user becomes a senior'
);
select tests.clear_authentication();
select ok(
  (select friend_code ~ '^[A-HJ-NP-Z2-9]{6}$' from public.seniors where profile_id = tests.uid('newcomer')),
  'a new senior gets a friend code'
);
select ok(
  (select code ~ '^[A-HJ-NP-Z2-9]{6}$' from public.senior_link_codes where senior_id = tests.uid('newcomer')),
  'a new senior gets a link code'
);
select ok(
  (select share_weekly_report and share_fall_alerts and show_on_leaderboard and plan = 'free'
   from public.seniors where profile_id = tests.uid('newcomer')),
  'sharing starts on, and the plan starts free (Q4)'
);
select tests.authenticate_as('caregiver');
select throws_ok(
  $$insert into public.seniors (profile_id) values (tests.uid('stranger_two'))$$,
  '42501', null, 'nobody creates a senior record for someone else'
);
select tests.clear_authentication();

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------

select tests.authenticate_as('senior');
select lives_ok(
  $$insert into public.sessions (senior_id) values (auth.uid())$$,
  'a senior starts a session'
);
select tests.clear_authentication();
select results_eq(
  $$select local_date, status::text, source::text, prescription_id
    from public.sessions where senior_id = tests.uid('senior') and status = 'in_progress'$$,
  $$values (private.sg_today(), 'in_progress', 'manual', tests.uid('prescription'))$$,
  'a new session is dated today, manual, on the programme in force'
);

select tests.authenticate_as('senior');
select throws_ok(
  $$insert into public.sessions (senior_id, local_date) values (auth.uid(), private.sg_today() - 3)$$,
  '42501', null, 'a senior cannot backdate a session'
);
select throws_ok(
  $$insert into public.sessions (senior_id, source) values (auth.uid(), 'sleeve')$$,
  '42501', null, 'a senior cannot choose the source'
);
select throws_ok(
  $$insert into public.sessions (senior_id) values (auth.uid())$$,
  '23505', null, 'only one session is in progress at a time'
);
select throws_ok(
  $$insert into public.sessions (senior_id) values (tests.uid('friend'))$$,
  '42501', null, 'a senior cannot start a session for someone else'
);

select throws_ok(
  $$update public.sessions set status = 'complete' where senior_id = auth.uid() and status = 'in_progress'$$,
  'session_empty', 'a session with no exercises done cannot count as complete'
);
select lives_ok(
  $$insert into public.session_exercises (session_id, exercise_id, position, reps_target, reps_done)
    select id, 'seated-knee-extension', 1, 10, 10 from public.sessions
    where senior_id = auth.uid() and status = 'in_progress'$$,
  'a senior records a finished exercise'
);
select lives_ok(
  $$update public.session_exercises set hurt = false, easy = true
    where session_id in (select id from public.sessions where status = 'in_progress')$$,
  'a senior answers the two questions'
);
select throws_ok(
  $$update public.session_exercises set form_score = 9
    where session_id in (select id from public.sessions where status = 'in_progress')$$,
  '42501', null, 'a senior cannot give themselves a form score'
);

select lives_ok(
  $$update public.sessions set status = 'complete' where senior_id = auth.uid() and status = 'in_progress'$$,
  'a senior finishes the session'
);
select tests.clear_authentication();
select ok(
  (select ended_at is not null from public.sessions
   where senior_id = tests.uid('senior') and local_date = private.sg_today()),
  'finishing stamps the end time'
);

select tests.authenticate_as('senior');
update public.sessions set status = 'incomplete' where senior_id = auth.uid() and local_date = private.sg_today();
select throws_ok(
  $$insert into public.session_exercises (session_id, exercise_id, position, reps_target)
    select id, 'quad-sets', 2, 10 from public.sessions
    where senior_id = auth.uid() and local_date = private.sg_today()$$,
  '42501', null, 'nothing can be added to a finished session'
);
update public.session_exercises set hurt = true
where session_id in (select id from public.sessions where local_date = private.sg_today());
select tests.clear_authentication();
select is(
  (select status::text from public.sessions
   where senior_id = tests.uid('senior') and local_date = private.sg_today()),
  'complete',
  'a finished session keeps its status'
);
select is(
  (select hurt from public.session_exercises se join public.sessions s on s.id = se.session_id
   where s.senior_id = tests.uid('senior') and s.local_date = private.sg_today()),
  false,
  'a finished session keeps its answers'
);
select throws_ok(
  $$update public.sessions set status = 'incomplete'
    where senior_id = tests.uid('senior') and local_date = private.sg_today()$$,
  'session_finished',
  'even server code cannot reopen or change a finished session'
);
select throws_ok(
  $$insert into public.session_exercises (session_id, exercise_id, position, reps_target, form_score)
    values (tests.uid('session'), 'quad-sets', 3, 10, 7)$$,
  '23514', null, 'a manual record never has a form score'
);

-- A session left open yesterday is closed when a new one starts.
insert into public.sessions (senior_id, local_date, started_at)
values (tests.uid('friend'), private.sg_today() - 1, now() - interval '1 day');
select tests.authenticate_as('friend');
select lives_ok($$insert into public.sessions (senior_id) values (auth.uid())$$,
  'a new day''s session starts even if yesterday''s was left open');
select tests.clear_authentication();
select is(
  (select status::text from public.sessions
   where senior_id = tests.uid('friend') and local_date = private.sg_today() - 1),
  'incomplete',
  'yesterday''s open session is marked incomplete'
);

select tests.authenticate_as('caregiver');
select throws_ok(
  $$insert into public.sessions (senior_id) values (tests.uid('senior'))$$,
  '42501', null, 'a caregiver cannot log a session for the senior'
);
select tests.clear_authentication();

-- ---------------------------------------------------------------------------
-- Care team writes
-- ---------------------------------------------------------------------------

select tests.authenticate_as('caregiver');
select lives_ok(
  $$insert into public.caregiver_notes (senior_id, body) values (tests.uid('senior'), 'Walked to the market today.')$$,
  'a caregiver writes a note (Plus, unlocked)'
);
select throws_ok(
  $$insert into public.caregiver_notes (senior_id, author_id, body)
    values (tests.uid('senior'), tests.uid('physio'), 'Pretending to be the physio')$$,
  '42501', null, 'a caregiver cannot write a note as someone else'
);
select throws_ok(
  $$insert into public.nudges (senior_id) values (tests.uid('senior'))$$,
  'nudge_rate_limited',
  'a caregiver can nudge once a day'
);
select tests.clear_authentication();
delete from public.nudges;
select tests.authenticate_as('caregiver');
select lives_ok(
  $$insert into public.nudges (senior_id) values (tests.uid('senior'))$$,
  'a caregiver sends a gentle nudge (Plus, unlocked)'
);
select throws_ok(
  $$insert into public.senior_clinical (senior_id, notes) values (tests.uid('friend'), 'x')$$,
  '42501', null, 'a caregiver cannot write clinical details'
);
select throws_ok(
  $$insert into public.visits (senior_id, scheduled_at) values (tests.uid('senior'), now() + interval '1 day')$$,
  '42501', null, 'a caregiver cannot book visits'
);

select tests.clear_authentication();
select tests.set_paywall(true);
select tests.authenticate_as('caregiver');
select throws_ok(
  $$insert into public.caregiver_notes (senior_id, body) values (tests.uid('senior'), 'On Free')$$,
  '42501', null, 'with the paywall on, notes need Plus'
);
select tests.clear_authentication();
delete from public.nudges;
select tests.authenticate_as('caregiver');
select throws_ok(
  $$insert into public.nudges (senior_id) values (tests.uid('senior'))$$,
  '42501', null, 'with the paywall on, nudges need Plus'
);
select tests.clear_authentication();
select tests.set_paywall(false);

select tests.authenticate_as('senior');
select lives_ok(
  $$update public.nudges set seen_at = now() where senior_id = auth.uid()$$,
  'a senior marks a nudge as seen'
);
select throws_ok(
  $$insert into public.caregiver_notes (senior_id, body) values (auth.uid(), 'About myself')$$,
  '42501', null, 'a senior reads notes but does not write them (Q5)'
);
select tests.clear_authentication();

select tests.authenticate_as('physio');
select lives_ok(
  $$update public.senior_clinical set affected_knee = 'both', notes = 'Updated'
    where senior_id = tests.uid('senior')$$,
  'the physio edits clinical details'
);
select throws_ok(
  $$insert into public.caregiver_notes (senior_id, body) values (tests.uid('senior'), 'A physio note')$$,
  '42501', null, 'a physio cannot write caregiver notes'
);
select throws_ok(
  $$insert into public.nudges (senior_id) values (tests.uid('senior'))$$,
  '42501', null, 'a physio cannot send nudges'
);
select lives_ok(
  $$insert into public.visits (senior_id, scheduled_at, location)
    values (tests.uid('senior'), now() + interval '14 days', 'Clinic room 2')$$,
  'the physio books a visit'
);
select lives_ok(
  $$update public.visits set status = 'completed' where location = 'Clinic room 2'$$,
  'the physio completes a visit'
);
select tests.clear_authentication();
select is(
  (select updated_by from public.senior_clinical where senior_id = tests.uid('senior')),
  tests.uid('physio'),
  'clinical details record who changed them'
);
select results_eq(
  $$select physio_id, completed_at is not null, period_start from public.visits where location = 'Clinic room 2'$$,
  $$values (tests.uid('physio'), true, ((now() - interval '60 days') at time zone 'Asia/Singapore')::date)$$,
  'a completed visit records when, and covers the time since the programme started'
);

select tests.authenticate_as('physio_pending');
select throws_ok(
  $$insert into public.visits (senior_id, scheduled_at) values (tests.uid('senior'), now() + interval '1 day')$$,
  '42501', null, 'a pending physio cannot book visits'
);
update public.senior_clinical set notes = 'Pending physio' where senior_id = tests.uid('senior');
select tests.clear_authentication();
select is(
  (select notes from public.senior_clinical where senior_id = tests.uid('senior')),
  'Updated',
  'a pending physio cannot edit clinical details'
);

-- ---------------------------------------------------------------------------
-- Push tokens
-- ---------------------------------------------------------------------------

select tests.authenticate_as('caregiver');
select lives_ok(
  $$insert into public.push_tokens (token, platform) values ('ExponentPushToken[caregiver]', 'android')$$,
  'a user registers their push token'
);
delete from public.push_tokens where token = 'ExponentPushToken[senior]';
select tests.clear_authentication();
select is(
  (select count(*)::int from public.push_tokens where token = 'ExponentPushToken[senior]'),
  1,
  'nobody deletes someone else''s push token'
);

select * from finish();
rollback;
