-- Friends and the leaderboard: send_friend_request, respond_to_friend_request,
-- remove_friend, list_friendships and get_friend_leaderboard.

begin;
select * from no_plan();

select tests.create_senior('senior');
select tests.create_senior('friend');
select tests.create_senior('shy_friend');
select tests.create_senior('stranger');
select tests.create_user('caregiver');

select tests.friend_code('friend') as friend_code \gset
select tests.friend_code('senior') as senior_code \gset

-- ---------------------------------------------------------------------------
-- Requests
-- ---------------------------------------------------------------------------

select tests.authenticate_as('caregiver');
select throws_ok(format('select public.send_friend_request(%L)', :'friend_code'), 'not_a_senior',
  'only seniors have friends');
select tests.clear_authentication();

select tests.authenticate_as('senior');
select throws_ok('select public.send_friend_request(''ZZZZZZ'')', 'invalid_code', 'an unknown code is refused');
select throws_ok(format('select public.send_friend_request(%L)', :'senior_code'), 'own_code',
  'a senior cannot befriend themselves');
select public.send_friend_request(:'friend_code') as request \gset
select is(public.send_friend_request(:'friend_code'), :'request'::uuid, 'asking twice is the same request');
select results_eq(
  'select friend_id, display_name, direction, status::text from public.list_friendships()',
  $$values (null::uuid, null::text, 'outgoing', 'pending')$$,
  'a sent request shows as pending, with no name yet'
);
select throws_ok('select count(*) from public.friendships', '42501', null,
  'friendships are only read through list_friendships()');
select tests.clear_authentication();

select tests.authenticate_as('friend');
select results_eq(
  'select friend_id, display_name, direction, status::text from public.list_friendships()',
  $$values (tests.uid('senior'), 'Senior', 'incoming', 'pending')$$,
  'the addressee sees who is asking'
);
select throws_ok(format('select public.remove_friend(%L)', gen_random_uuid()), 'not_found',
  'removing a friendship that is not yours fails');
select lives_ok(format('select public.respond_to_friend_request(%L, false)', :'request'),
  'the addressee dismisses it');
select is((select count(*)::int from public.list_friendships()), 0, 'a dismissed request disappears for the addressee');
select tests.clear_authentication();

select tests.authenticate_as('senior');
select results_eq(
  'select status::text from public.list_friendships()',
  $$values ('pending')$$,
  'a dismissed request still shows as sent to the requester'
);
select throws_ok(format('select public.respond_to_friend_request(%L, true)', :'request'), 'not_found',
  'the requester cannot accept their own request');
select tests.clear_authentication();

-- The friend changes their mind and asks back, which accepts.
select tests.authenticate_as('friend');
select is(public.send_friend_request(:'senior_code'), :'request'::uuid, 'asking back reuses the request');
select tests.clear_authentication();
select tests.authenticate_as('senior');
select results_eq(
  'select friend_id, display_name, status::text from public.list_friendships()',
  $$values (tests.uid('friend'), 'Friend', 'accepted')$$,
  'they are now friends, with names'
);
select is((select display_name from public.profiles where id = tests.uid('friend')), 'Friend',
  'friends can read each other''s names');
select is((select count(*)::int from public.seniors where profile_id = tests.uid('friend')), 0,
  'but not each other''s details');
select tests.clear_authentication();

-- ---------------------------------------------------------------------------
-- Leaderboard
-- ---------------------------------------------------------------------------

select tests.befriend('shy_friend', 'senior', 'pending');
select tests.authenticate_as('senior');
select lives_ok(
  format('select public.respond_to_friend_request(%L, true)',
    (select friendship_id from public.list_friendships() where friend_id = tests.uid('shy_friend'))),
  'the senior accepts a request'
);
select tests.clear_authentication();
update public.seniors set show_on_leaderboard = false where profile_id = tests.uid('shy_friend');

insert into public.senior_stats (senior_id, as_of_date, week_start, week_rate, streak)
values
  (tests.uid('senior'), private.sg_today(), private.sg_today() - (extract(isodow from private.sg_today())::int - 1), 43, 3),
  -- Last week's rate: the board has reset since.
  (tests.uid('friend'), private.sg_today() - 7, private.sg_today() - 6 - extract(isodow from private.sg_today())::int, 90, 5),
  (tests.uid('stranger'), private.sg_today(), private.sg_today() - (extract(isodow from private.sg_today())::int - 1), 100, 9);

select tests.authenticate_as('senior');
select results_eq(
  'select display_name, streak, week_rate, is_me from public.get_friend_leaderboard() order by display_name',
  $$values ('Friend', 5, 0, false), ('Senior', 3, 43, true)$$,
  'the leaderboard shows me and friends who allow it, with this week''s rate only'
);
select tests.clear_authentication();

update public.seniors set show_on_leaderboard = false where profile_id = tests.uid('senior');
select tests.authenticate_as('senior');
select is((select count(*)::int from public.get_friend_leaderboard() where is_me), 1,
  'a senior always sees themselves');
select tests.clear_authentication();
select tests.authenticate_as('friend');
select is((select count(*)::int from public.get_friend_leaderboard() where not is_me), 0,
  'a senior who hides from the leaderboard is hidden from friends');
select tests.clear_authentication();

select tests.authenticate_as('caregiver');
select is((select count(*)::int from public.get_friend_leaderboard()), 0,
  'a caregiver has no leaderboard');
select tests.clear_authentication();

-- ---------------------------------------------------------------------------
-- Removing
-- ---------------------------------------------------------------------------

select tests.authenticate_as('stranger');
select throws_ok(format('select public.remove_friend(%L)', :'request'), 'not_found',
  'a stranger cannot end a friendship');
select tests.clear_authentication();

select tests.authenticate_as('friend');
select lives_ok(format('select public.remove_friend(%L)', :'request'), 'either friend can remove the other');
select is((select count(*)::int from public.list_friendships()), 0, 'the friendship is gone');
select tests.clear_authentication();

select * from finish();
rollback;
