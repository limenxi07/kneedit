-- simulate_possible_fall(): demo caregivers only, and it writes one fake fall
-- event and one alert that the caregiver can then see.

begin;
select * from no_plan();

select tests.build_world();
select tests.create_senior('demo_senior', true);
select tests.create_user('demo_caregiver', true);
select tests.create_user('demo_physio', true);
select tests.link('demo_senior', 'demo_caregiver', 'caregiver');
select tests.link('demo_senior', 'demo_physio', 'physio');

create temporary table falls_before on commit drop as
select count(*)::int as n from public.fall_events where senior_id <> tests.uid('demo_senior');

select throws_ok($$select public.simulate_possible_fall(tests.uid('demo_senior'))$$, 'not_allowed',
  'nobody signed in, nothing simulated');

select tests.authenticate_as('caregiver');
select throws_ok($$select public.simulate_possible_fall(tests.uid('senior'))$$, 'demo_only',
  'a real caregiver cannot create fake falls for a real senior');
select throws_ok($$select public.simulate_possible_fall(tests.uid('demo_senior'))$$, 'not_allowed',
  'nor for a demo senior they are not linked to');
select tests.clear_authentication();

select tests.authenticate_as('demo_physio');
select throws_ok($$select public.simulate_possible_fall(tests.uid('demo_senior'))$$, 'not_allowed',
  'a physio cannot simulate falls');
select tests.clear_authentication();

select tests.authenticate_as('demo_senior');
select throws_ok($$select public.simulate_possible_fall(tests.uid('demo_senior'))$$, 'not_allowed',
  'nor can the senior');
select tests.clear_authentication();

select tests.authenticate_as('demo_caregiver');
select lives_ok($$select public.simulate_possible_fall(tests.uid('demo_senior'))$$,
  'a demo caregiver simulates a possible fall');
select is(
  (select count(*)::int from public.alerts
   where senior_id = tests.uid('demo_senior') and kind = 'possible_fall' and source = 'fake'),
  1,
  'and sees the new possible fall alert, marked as fake'
);
select tests.clear_authentication();

select is(
  (select count(*)::int from public.fall_events
   where senior_id = tests.uid('demo_senior') and source = 'fake' and details ->> 'simulated' = 'true'),
  1,
  'the fake fall event is recorded'
);
select is(
  (select count(*)::int from public.fall_events where senior_id <> tests.uid('demo_senior')),
  (select n from falls_before),
  'nothing is written for anyone else'
);

select * from finish();
rollback;
