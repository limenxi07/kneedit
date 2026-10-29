-- has_plus, mock_set_plan, save_prescription and prescription_in_force.

begin;
select * from no_plan();

select tests.build_world();

-- ---------------------------------------------------------------------------
-- Plus
-- ---------------------------------------------------------------------------

select ok(private.has_plus(tests.uid('senior')), 'with the paywall off, everyone has Plus');

select tests.authenticate_as('senior');
select is(public.mock_set_plan(tests.uid('senior'), 'plus'), false,
  'with the paywall off, the mock checkout changes nothing');
select tests.clear_authentication();
select is((select plan::text from public.seniors where profile_id = tests.uid('senior')), 'free',
  'the plan stays free');

select tests.set_paywall(true);
select ok(not private.has_plus(tests.uid('senior')), 'with the paywall on, Free is Free');

select tests.authenticate_as('caregiver');
select is(public.mock_set_plan(tests.uid('senior'), 'plus'), true, 'a caregiver upgrades the senior');
select ok(private.has_plus(tests.uid('senior')), 'and Plus is on');
select tests.clear_authentication();

select tests.authenticate_as('senior');
select is(public.mock_set_plan(tests.uid('senior'), 'free'), true, 'the senior can switch back');
select tests.clear_authentication();

select tests.authenticate_as('physio');
select throws_ok(format('select public.mock_set_plan(%L, %L)', tests.uid('senior'), 'plus'), 'not_allowed',
  'a physio cannot change the senior''s plan');
select tests.clear_authentication();
select tests.authenticate_as('caregiver_pending');
select throws_ok(format('select public.mock_set_plan(%L, %L)', tests.uid('senior'), 'plus'), 'not_allowed',
  'a pending caregiver cannot change the plan');
select tests.clear_authentication();
select tests.set_paywall(false);

-- ---------------------------------------------------------------------------
-- Prescribing
-- ---------------------------------------------------------------------------

select tests.authenticate_as('physio');
select public.save_prescription(
  tests.uid('senior'), private.sg_today() + 2, 'by_weekday',
  '[{"exercise_id": "quad-sets", "reps": 12, "weekday": 1},
    {"exercise_id": "heel-raises", "reps": 8, "weekday": 1, "frequency": "twice_daily"},
    {"exercise_id": "mini-squats", "reps": 6, "weekday": 3, "frequency": "alternate_days"}]'
) as new_plan \gset
select tests.clear_authentication();

select results_eq(
  format($$select exercise_id, position, reps, frequency::text, weekday
    from public.prescription_items where prescription_id = %L order by weekday, position$$, :'new_plan'),
  $$values ('quad-sets', 1, 12, 'daily', 1::smallint), ('heel-raises', 2, 8, 'twice_daily', 1::smallint),
    ('mini-squats', 1, 6, 'alternate_days', 3::smallint)$$,
  'the programme is saved in order, numbered per weekday'
);
select results_eq(
  $$select id, replaced_at is not null from public.prescriptions
    where senior_id = tests.uid('senior') order by created_at, replaced_at nulls last$$,
  format($$values (%L::uuid, true), (%L::uuid, false)$$, tests.uid('prescription'), :'new_plan'),
  'the previous version is marked replaced'
);
select is(private.prescription_in_force(tests.uid('senior'), private.sg_today()), tests.uid('prescription'),
  'the old programme stays in force until the new one starts');
select is(private.prescription_in_force(tests.uid('senior'), private.sg_today() + 2), :'new_plan'::uuid,
  'the new programme applies from its start date');
select is(private.prescription_in_force(tests.uid('senior'), private.sg_today() - 31), null,
  'before the first programme, the default routine applies');

-- A later version that starts sooner overrides one that hasn't started yet.
select tests.authenticate_as('physio');
select public.save_prescription(
  tests.uid('senior'), private.sg_today() + 1, 'same_every_day',
  '[{"exercise_id": "ankle-pumps", "reps": 20}]'
) as sooner_plan \gset
select tests.clear_authentication();
select is(private.prescription_in_force(tests.uid('senior'), private.sg_today() + 5), :'sooner_plan'::uuid,
  'the most recent version wins once it has started');

select tests.authenticate_as('physio');
select throws_ok(
  format('select public.save_prescription(%L, %L, %L, %L)', tests.uid('senior'), private.sg_today() - 1,
    'same_every_day', '[{"exercise_id": "quad-sets", "reps": 10}]'),
  'start_in_past', 'a programme cannot start in the past'
);
select throws_ok(
  format('select public.save_prescription(%L, %L, %L, %L)', tests.uid('senior'), private.sg_today(),
    'same_every_day', '[]'),
  'no_items', 'a programme needs at least one exercise'
);
select throws_ok(
  format('select public.save_prescription(%L, %L, %L, %L)', tests.uid('senior'), private.sg_today(),
    'same_every_day', '[{"exercise_id": "quad-sets", "reps": 10, "weekday": 2}]'),
  'weekday_mismatch', 'weekdays belong to by_weekday programmes only'
);
select throws_ok(
  format('select public.save_prescription(%L, %L, %L, %L)', tests.uid('senior'), private.sg_today(),
    'by_weekday', '[{"exercise_id": "quad-sets", "reps": 10}]'),
  'weekday_mismatch', 'a by_weekday programme gives every exercise a weekday'
);
select tests.clear_authentication();

select tests.authenticate_as('caregiver');
select throws_ok(
  format('select public.save_prescription(%L, %L, %L, %L)', tests.uid('senior'), private.sg_today(),
    'same_every_day', '[{"exercise_id": "quad-sets", "reps": 10}]'),
  'not_allowed', 'a caregiver cannot prescribe'
);
select tests.clear_authentication();
select tests.authenticate_as('physio_pending');
select throws_ok(
  format('select public.save_prescription(%L, %L, %L, %L)', tests.uid('senior'), private.sg_today(),
    'same_every_day', '[{"exercise_id": "quad-sets", "reps": 10}]'),
  'not_allowed', 'a pending physio cannot prescribe'
);
select tests.clear_authentication();

select tests.authenticate_as('caregiver');
select is((select count(*)::int from public.prescriptions where senior_id = tests.uid('senior')), 3,
  'the caregiver reads every version of the programme');
select tests.clear_authentication();

select * from finish();
rollback;
