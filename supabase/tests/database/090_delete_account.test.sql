-- delete_my_account(): who may delete, and what goes. The cascades
-- themselves are covered in 080_cascades; this checks the RPC drives them
-- for the caller only.

begin;
select * from no_plan();

select tests.build_world();
select tests.create_senior('demo_senior', true);

-- Everyone in the world signed in an hour ago, except the stale physio.
update auth.users set last_sign_in_at = now() - interval '1 hour'
where id in (
  tests.uid('senior'), tests.uid('friend'), tests.uid('stranger'), tests.uid('caregiver'),
  tests.uid('caregiver_pending'), tests.uid('caregiver_revoked'), tests.uid('physio'),
  tests.uid('physio_pending'), tests.uid('demo_senior')
);
update auth.users set last_sign_in_at = now() - interval '25 hours'
where id = tests.uid('physio_pending');

-- ---------------------------------------------------------------------------
-- Refusals
-- ---------------------------------------------------------------------------

select throws_ok($$select public.delete_my_account('DELETE')$$, 'not_signed_in',
  'nobody signed in, nothing deleted');

select tests.authenticate_as('senior');
select throws_ok($$select public.delete_my_account('')$$, 'confirmation_mismatch',
  'the confirmation word is required');
select throws_ok($$select public.delete_my_account('delete me')$$, 'confirmation_mismatch',
  'and must be the word shown');
select tests.clear_authentication();

select tests.authenticate_as('physio_pending');
select throws_ok($$select public.delete_my_account('DELETE')$$, 'reauth_required',
  'a sign-in older than 24 hours must sign in again');
select tests.clear_authentication();

update auth.users set last_sign_in_at = null where id = tests.uid('caregiver_pending');
select tests.authenticate_as('caregiver_pending');
select throws_ok($$select public.delete_my_account('DELETE')$$, 'reauth_required',
  'and so must an account with no recorded sign-in');
select tests.clear_authentication();

select tests.authenticate_as('demo_senior');
select throws_ok($$select public.delete_my_account('DELETE')$$, 'demo_account',
  'demo accounts are reset by the seed script instead');
select tests.clear_authentication();

select is(
  (select count(*)::int from auth.users where id in (
    tests.uid('senior'), tests.uid('physio_pending'), tests.uid('caregiver_pending'), tests.uid('demo_senior'))),
  4,
  'every refused account is still there'
);

-- ---------------------------------------------------------------------------
-- A caregiver deletes their account
-- ---------------------------------------------------------------------------

select tests.authenticate_as('caregiver');
select lives_ok($$select public.delete_my_account(' delete ')$$,
  'the English word works in any case, with spaces around it');
select tests.clear_authentication();

select is((select count(*)::int from auth.users where id = tests.uid('caregiver')), 0,
  'the caregiver is gone');
select is((select count(*)::int from public.profiles where id = tests.uid('caregiver')), 0,
  'with their profile');
select is((select count(*)::int from public.caregiver_notes where senior_id = tests.uid('senior') and author_id is null), 1,
  'their note stays on the senior''s record, with no author (Q10)');
select is((select count(*)::int from public.sessions where senior_id = tests.uid('senior')), 1,
  'the senior''s records are untouched');

-- ---------------------------------------------------------------------------
-- A physio deletes their account, in Chinese
-- ---------------------------------------------------------------------------

select tests.authenticate_as('physio');
select lives_ok($$select public.delete_my_account('删除')$$, 'the Chinese word works');
select tests.clear_authentication();

select results_eq(
  $$select physio_id from public.prescriptions where senior_id = tests.uid('senior')$$,
  $$values (null::uuid)$$,
  'the programme stays, with no author (Q10)'
);
select is((select count(*)::int from public.visits where senior_id = tests.uid('senior') and physio_id is null), 1,
  'and so do the visits');

-- ---------------------------------------------------------------------------
-- The senior deletes their account
-- ---------------------------------------------------------------------------

select tests.authenticate_as('senior');
select lives_ok($$select public.delete_my_account('DELETE')$$, 'the senior deletes their account');
select tests.clear_authentication();

select is((select count(*)::int from public.seniors where profile_id = tests.uid('senior')), 0,
  'the senior record is gone');
select is((select count(*)::int from public.sessions where senior_id = tests.uid('senior')), 0,
  'with every session');
select is((select count(*)::int from public.care_links where senior_id = tests.uid('senior')), 0,
  'and every link, so the care team loses access at once');
select is((select count(*)::int from public.friendships where tests.uid('senior') in (requester_id, addressee_id)), 0,
  'and every friendship');
select is((select count(*)::int from public.seniors where profile_id = tests.uid('friend')), 1,
  'the friend is untouched');
select is((select count(*)::int from public.profiles where id = tests.uid('caregiver_pending')), 1,
  'and so is everyone else');

select * from finish();
rollback;
