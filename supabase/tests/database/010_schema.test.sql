begin;
select plan(10);

select is(
  (select array_agg(c.relname::text order by c.relname)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  null,
  'every public table has row level security on'
);

select is(
  (select paywall_enabled from public.app_settings),
  false,
  'the paywall starts off'
);

select is((select count(*)::int from public.app_settings), 1, 'app_settings has one row');

select ok(
  (select count(*) from public.exercises) >= 5,
  'the exercise library is seeded'
);

select is(
  (select array_agg(exercise_id order by position) from public.default_routine_items),
  array['seated-knee-extension', 'ankle-pumps', 'quad-sets'],
  'the starter routine is the first three exercises'
);

select is(
  (select count(*)::int from public.exercises where review_status <> 'draft_pending_signoff'),
  0,
  'every exercise is a draft pending sign-off'
);

select throws_ok(
  $$insert into public.exercises (id, name, steps, default_reps, focus_tag, position_tag)
    values ('one-language', '{"en": "Only English"}', '{"en": ["Step"], "zh-Hans": ["步骤"]}', 5, 'strength', 'seated')$$,
  '23514',
  null,
  'an exercise name needs both languages'
);

select is(
  (select public from storage.buckets where id = 'exercise-media'),
  true,
  'the exercise-media bucket exists'
);

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private') and p.prosecdef
     and not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')),
  0,
  'every security definer function pins its search_path'
);

select is(
  (select array_agg(p.proname::text order by p.proname)
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'),
  array[
    'delete_my_account', 'get_friend_leaderboard', 'list_friendships', 'mock_set_plan', 'redeem_link_code',
    'regenerate_link_code', 'remove_friend', 'respond_to_friend_request', 'respond_to_link',
    'revoke_link', 'save_prescription', 'send_friend_request', 'simulate_possible_fall'
  ],
  'the API exposes only the RPCs; helpers live in the private schema'
);

select * from finish();
rollback;
