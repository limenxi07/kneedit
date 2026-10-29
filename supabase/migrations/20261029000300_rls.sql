-- Who can see and change what. This is the "Who can see what" matrix in
-- PLAN.md; supabase/tests/database/ checks every cell with the paywall both
-- off and on.
--
-- Clients get only the privileges listed here, column by column for writes,
-- so they can't set server-owned columns (plan, is_demo, source, timestamps).
-- The service role bypasses RLS and is only used by server code and the
-- local seed script.

revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public, private from public, anon, authenticated;

alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.seniors enable row level security;
alter table public.senior_link_codes enable row level security;
alter table public.senior_clinical enable row level security;
alter table public.care_links enable row level security;
alter table public.friendships enable row level security;
alter table public.tags enable row level security;
alter table public.exercises enable row level security;
alter table public.default_routine_items enable row level security;
alter table public.prescriptions enable row level security;
alter table public.prescription_items enable row level security;
alter table public.sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.daily_activity enable row level security;
alter table public.fall_events enable row level security;
alter table public.sleeve_devices enable row level security;
alter table public.senior_stats enable row level security;
alter table public.leaderboard_weeks enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.caregiver_notes enable row level security;
alter table public.visits enable row level security;
alter table public.visit_summaries enable row level security;
alter table public.alerts enable row level security;
alter table public.nudges enable row level security;
alter table public.push_tokens enable row level security;

-- ---------------------------------------------------------------------------
-- Settings and the library: read-only for everyone signed in
-- ---------------------------------------------------------------------------

grant select on public.app_settings, public.tags, public.exercises,
  public.default_routine_items to authenticated;

create policy "signed in can read" on public.app_settings
  for select to authenticated using (true);
create policy "signed in can read" on public.tags
  for select to authenticated using (true);
create policy "signed in can read" on public.exercises
  for select to authenticated using (true);
create policy "signed in can read" on public.default_routine_items
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

grant select on public.profiles to authenticated;
grant update (display_name, locale, timezone, default_context) on public.profiles to authenticated;

create policy "visible profiles" on public.profiles
  for select to authenticated using (private.can_see_profile(id));
create policy "own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

grant select on public.seniors to authenticated;
grant insert (profile_id, birth_year, gender, reminder_time, share_weekly_report,
  share_fall_alerts, show_on_leaderboard) on public.seniors to authenticated;
grant update (birth_year, gender, reminder_time, share_weekly_report, share_fall_alerts,
  show_on_leaderboard) on public.seniors to authenticated;

create policy "self and care team" on public.seniors
  for select to authenticated
  using (profile_id = (select auth.uid()) or private.is_linked(profile_id));
create policy "become a senior" on public.seniors
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "own senior record" on public.seniors
  for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

grant select on public.senior_link_codes to authenticated;
create policy "own code" on public.senior_link_codes
  for select to authenticated using (senior_id = (select auth.uid()));

grant select on public.care_links to authenticated;
create policy "either end of the link" on public.care_links
  for select to authenticated
  using (senior_id = (select auth.uid()) or member_id = (select auth.uid()));
-- Links and friendships change only through RPCs (see the RPC migration).
-- Friendships have no table access at all: list_friendships() hides what a
-- requester shouldn't learn.

grant select, insert (senior_id, affected_knee, notes), update (affected_knee, notes)
  on public.senior_clinical to authenticated;
create policy "senior and physio read" on public.senior_clinical
  for select to authenticated
  using (senior_id = (select auth.uid()) or private.is_linked(senior_id, 'physio'));
create policy "physio adds" on public.senior_clinical
  for insert to authenticated with check (private.is_linked(senior_id, 'physio'));
create policy "physio edits" on public.senior_clinical
  for update to authenticated
  using (private.is_linked(senior_id, 'physio')) with check (private.is_linked(senior_id, 'physio'));

-- ---------------------------------------------------------------------------
-- Programme: the senior and the whole care team read it. Physios change it
-- through save_prescription().
-- ---------------------------------------------------------------------------

grant select on public.prescriptions, public.prescription_items to authenticated;
create policy "senior and care team" on public.prescriptions
  for select to authenticated
  using (senior_id = (select auth.uid()) or private.is_linked(senior_id));
create policy "senior and care team" on public.prescription_items
  for select to authenticated
  using (exists (
    select 1 from public.prescriptions p
    where p.id = prescription_id
      and (p.senior_id = (select auth.uid()) or private.is_linked(p.senior_id))
  ));

-- ---------------------------------------------------------------------------
-- Sessions
--
-- Dates and status: senior, physio, caregiver on Plus with the report shared.
-- Answers and scores: senior, physio on Plus, caregiver on Plus with the
-- report shared.
-- ---------------------------------------------------------------------------

grant select, insert (senior_id), update (status) on public.sessions to authenticated;
create policy "readers" on public.sessions
  for select to authenticated
  using (
    senior_id = (select auth.uid())
    or private.is_linked(senior_id, 'physio')
    or private.caregiver_sees_report(senior_id)
  );
-- Only the senior's own manual sessions; local_date, timestamps and source
-- take their server defaults because those columns aren't granted.
create policy "senior starts" on public.sessions
  for insert to authenticated with check (senior_id = (select auth.uid()));
create policy "senior finishes" on public.sessions
  for update to authenticated
  using (senior_id = (select auth.uid()) and status = 'in_progress')
  with check (senior_id = (select auth.uid()));

grant select, insert (session_id, exercise_id, position, reps_target, reps_done, hurt, easy),
  update (reps_done, hurt, easy) on public.session_exercises to authenticated;
create policy "readers" on public.session_exercises
  for select to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = session_id
      and (
        s.senior_id = (select auth.uid())
        or private.is_linked_plus(s.senior_id, 'physio')
        or private.caregiver_sees_report(s.senior_id)
      )
  ));
create policy "senior records while in progress" on public.session_exercises
  for insert to authenticated
  with check (exists (
    select 1 from public.sessions s
    where s.id = session_id and s.senior_id = (select auth.uid()) and s.status = 'in_progress'
  ));
create policy "senior answers while in progress" on public.session_exercises
  for update to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = session_id and s.senior_id = (select auth.uid()) and s.status = 'in_progress'
  ));

-- ---------------------------------------------------------------------------
-- Sleeve data. Written by server code (and later by the sleeve sync).
-- ---------------------------------------------------------------------------

grant select on public.daily_activity, public.fall_events, public.sleeve_devices
  to authenticated;
create policy "readers" on public.daily_activity
  for select to authenticated
  using (
    senior_id = (select auth.uid())
    or private.is_linked_plus(senior_id, 'physio')
    or private.caregiver_sees_report(senior_id)
  );
create policy "readers" on public.fall_events
  for select to authenticated
  using (
    senior_id = (select auth.uid())
    or private.is_linked_plus(senior_id, 'physio')
    or private.caregiver_sees_falls(senior_id)
  );
create policy "senior only" on public.sleeve_devices
  for select to authenticated using (senior_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Derived records
-- ---------------------------------------------------------------------------

grant select on public.senior_stats, public.leaderboard_weeks, public.weekly_reports
  to authenticated;
-- Streak and sessions this month are free for the whole care team; friends
-- get theirs through get_friend_leaderboard().
create policy "senior and care team" on public.senior_stats
  for select to authenticated
  using (senior_id = (select auth.uid()) or private.is_linked(senior_id));
create policy "senior only" on public.leaderboard_weeks
  for select to authenticated using (senior_id = (select auth.uid()));
create policy "readers" on public.weekly_reports
  for select to authenticated
  using (
    senior_id = (select auth.uid())
    or private.is_linked_plus(senior_id, 'physio')
    or private.caregiver_sees_report(senior_id)
  );

-- ---------------------------------------------------------------------------
-- Care team records
-- ---------------------------------------------------------------------------

grant select, insert (senior_id, body) on public.caregiver_notes to authenticated;
create policy "readers" on public.caregiver_notes
  for select to authenticated
  using (
    senior_id = (select auth.uid())
    or private.is_linked_plus(senior_id, 'caregiver')
    or private.is_linked_plus(senior_id, 'physio')
  );
create policy "caregiver on plus writes" on public.caregiver_notes
  for insert to authenticated
  with check (
    author_id = (select auth.uid()) and private.is_linked_plus(senior_id, 'caregiver')
  );

grant select,
  insert (senior_id, scheduled_at, duration_min, location, status),
  update (scheduled_at, duration_min, location, status)
  on public.visits to authenticated;
create policy "readers" on public.visits
  for select to authenticated
  using (
    senior_id = (select auth.uid())
    or private.is_linked(senior_id, 'physio')
    or private.is_linked_plus(senior_id, 'caregiver')
  );
create policy "physio books" on public.visits
  for insert to authenticated
  with check (physio_id = (select auth.uid()) and private.is_linked(senior_id, 'physio'));
create policy "physio updates" on public.visits
  for update to authenticated
  using (private.is_linked(senior_id, 'physio'))
  with check (private.is_linked(senior_id, 'physio'));

grant select on public.visit_summaries to authenticated;
create policy "readers" on public.visit_summaries
  for select to authenticated
  using (exists (
    select 1 from public.visits v
    where v.id = visit_id
      and (
        v.senior_id = (select auth.uid())
        or (part = 'adherence' and private.is_linked(v.senior_id, 'physio'))
        or (part = 'details' and private.is_linked_plus(v.senior_id, 'physio'))
      )
  ));

grant select on public.alerts to authenticated;
create policy "readers" on public.alerts
  for select to authenticated
  using (
    senior_id = (select auth.uid())
    or (kind = 'possible_fall' and private.caregiver_sees_falls(senior_id))
    or (kind <> 'possible_fall' and private.is_linked_plus(senior_id, 'caregiver'))
  );

grant select, insert (senior_id), update (seen_at) on public.nudges to authenticated;
create policy "senior and sender" on public.nudges
  for select to authenticated
  using (
    senior_id = (select auth.uid())
    or (sender_id = (select auth.uid()) and private.is_linked_plus(senior_id, 'caregiver'))
  );
create policy "caregiver on plus sends" on public.nudges
  for insert to authenticated
  with check (
    sender_id = (select auth.uid()) and private.is_linked_plus(senior_id, 'caregiver')
  );
create policy "senior marks seen" on public.nudges
  for update to authenticated
  using (senior_id = (select auth.uid())) with check (senior_id = (select auth.uid()));

grant select, insert (token, platform), delete on public.push_tokens to authenticated;
create policy "own tokens" on public.push_tokens
  for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Functions called from policies and column defaults must be executable by
-- signed-in users (and the service role, which also inserts).
-- ---------------------------------------------------------------------------

grant execute on function
  private.sg_today(),
  private.new_friend_code(),
  private.is_linked(uuid, public.link_role),
  private.has_plus(uuid),
  private.caregiver_sees_report(uuid),
  private.caregiver_sees_falls(uuid),
  private.is_linked_plus(uuid, public.link_role),
  private.can_see_profile(uuid),
  private.prescription_in_force(uuid, date),
  private.is_localized_text(jsonb),
  private.is_localized_list(jsonb)
  to authenticated, service_role;
