-- Linking a caregiver or physio: redeem_link_code, respond_to_link,
-- revoke_link and regenerate_link_code. Ids are kept in psql variables.

begin;
select * from no_plan();

select tests.create_senior('senior');
select tests.create_user('caregiver');
select tests.create_user('physio');
select tests.create_user('new_physio');

select tests.link_code('senior') as code \gset

-- ---------------------------------------------------------------------------
-- Redeeming a code
-- ---------------------------------------------------------------------------

select tests.authenticate_as('caregiver');
select throws_ok($$select public.redeem_link_code('ZZZZZZ', 'caregiver')$$, 'invalid_code',
  'an unknown code is refused');
select is((select count(*)::int from public.senior_link_codes), 0,
  'nobody but the senior can read a link code');

-- Codes are typed by hand, so spaces, dashes and lower case are fine.
select public.redeem_link_code(lower(substr(:'code', 1, 3) || ' - ' || substr(:'code', 4)), 'caregiver')
  as caregiver_link \gset
select isnt(:'caregiver_link'::uuid, null, 'a caregiver redeems a code');
select is(public.redeem_link_code(:'code', 'caregiver'), :'caregiver_link'::uuid,
  'redeeming twice returns the same request');
select is((select count(*)::int from public.profiles where id = tests.uid('senior')), 0,
  'the requester learns nothing about the senior before approval');
select is((select status::text from public.care_links where id = :'caregiver_link'), 'pending',
  'the requester sees their request is pending');
select throws_ok(format('select public.respond_to_link(%L, true)', :'caregiver_link'), 'not_found',
  'the requester cannot approve their own request');
select tests.clear_authentication();

select tests.authenticate_as('senior');
select throws_ok(format('select public.redeem_link_code(%L, %L)', :'code', 'caregiver'), 'own_code',
  'a senior cannot link to themselves');
select is((select display_name from public.profiles where id = tests.uid('caregiver')), 'Caregiver',
  'the senior sees who is asking');

-- ---------------------------------------------------------------------------
-- Responding
-- ---------------------------------------------------------------------------

select lives_ok(format('select public.respond_to_link(%L, true)', :'caregiver_link'),
  'the senior approves');
select throws_ok(format('select public.respond_to_link(%L, true)', :'caregiver_link'), 'not_found',
  'a request is answered once');
select tests.clear_authentication();

select tests.authenticate_as('caregiver');
select is((select count(*)::int from public.seniors where profile_id = tests.uid('senior')), 1,
  'once approved, the caregiver sees the senior');
select tests.clear_authentication();

-- A declined request is closed.
select tests.authenticate_as('physio');
select public.redeem_link_code(:'code', 'physio') as declined_link \gset
select tests.clear_authentication();
select tests.authenticate_as('senior');
select lives_ok(format('select public.respond_to_link(%L, false)', :'declined_link'),
  'the senior declines');
select tests.clear_authentication();
select is((select status::text from public.care_links where id = :'declined_link'), 'revoked',
  'a declined request is closed');

-- One physio at a time: approving a new one replaces the old one.
select tests.authenticate_as('physio');
select public.redeem_link_code(:'code', 'physio') as physio_link \gset
select tests.clear_authentication();
select tests.authenticate_as('senior');
select public.respond_to_link(:'physio_link', true);
select tests.clear_authentication();

select tests.authenticate_as('new_physio');
select public.redeem_link_code(:'code', 'physio') as new_physio_link \gset
select tests.clear_authentication();
select tests.authenticate_as('senior');
select lives_ok(format('select public.respond_to_link(%L, true)', :'new_physio_link'),
  'the senior approves a new physio');
select tests.clear_authentication();
select results_eq(
  $$select member_id from public.care_links
    where senior_id = tests.uid('senior') and role = 'physio' and status = 'active'$$,
  $$values (tests.uid('new_physio'))$$,
  'the new physio replaces the old one (Q8)'
);

-- ---------------------------------------------------------------------------
-- Revoking
-- ---------------------------------------------------------------------------

select tests.authenticate_as('new_physio');
select throws_ok(format('select public.revoke_link(%L)', :'caregiver_link'), 'not_found',
  'nobody else ends someone''s link');
select tests.clear_authentication();

select tests.authenticate_as('caregiver');
select lives_ok(format('select public.revoke_link(%L)', :'caregiver_link'), 'a caregiver leaves');
select is((select count(*)::int from public.seniors where profile_id = tests.uid('senior')), 0,
  'and loses access at once');
select tests.clear_authentication();
select is((select revoked_by from public.care_links where id = :'caregiver_link'), tests.uid('caregiver'),
  'the link records who ended it');

select tests.authenticate_as('senior');
select lives_ok(format('select public.revoke_link(%L)', :'new_physio_link'),
  'the senior removes their physio');

-- ---------------------------------------------------------------------------
-- A new code
-- ---------------------------------------------------------------------------

select public.regenerate_link_code() as new_code \gset
select isnt(:'new_code'::text, :'code'::text, 'the senior gets a new code');
select tests.clear_authentication();

select tests.authenticate_as('caregiver');
select throws_ok(format('select public.redeem_link_code(%L, %L)', :'code', 'caregiver'), 'invalid_code',
  'the old code stops working');
select lives_ok(format('select public.redeem_link_code(%L, %L)', :'new_code', 'caregiver'),
  'the new code works, and a removed caregiver may ask again');
select throws_ok('select public.regenerate_link_code()', 'not_a_senior',
  'only a senior has a code to change');
select tests.clear_authentication();

set local role anon;
select throws_ok(format('select public.redeem_link_code(%L, %L)', :'new_code', 'caregiver'), '42501', null,
  'signed-out visitors cannot call RPCs');
reset role;

select * from finish();
rollback;
