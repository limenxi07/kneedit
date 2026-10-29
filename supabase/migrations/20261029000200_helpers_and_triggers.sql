-- Helper functions used by RLS policies and RPCs, and the triggers that keep
-- records honest: profiles for new users, codes, session integrity, and the
-- wall between demo (fake) data and real accounts.

-- ---------------------------------------------------------------------------
-- Access helpers
--
-- `security definer` so policies can call them without recursing into RLS.
-- Each one only answers a yes/no question about the signed-in user.
-- ---------------------------------------------------------------------------

-- The signed-in user has an active link of this role (or any role) to the senior.
create function private.is_linked(p_senior uuid, p_role public.link_role default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.care_links
    where senior_id = p_senior
      and member_id = (select auth.uid())
      and status = 'active'
      and (p_role is null or role = p_role)
  );
$$;

-- Every Plus check goes through here. With the paywall off (the default), every
-- senior counts as Plus; with it on, only seniors on the plus plan do.
create function private.has_plus(p_senior uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not coalesce((select paywall_enabled from public.app_settings), false)
    or exists (select 1 from public.seniors where profile_id = p_senior and plan = 'plus');
$$;

-- Caregiver on Plus, and the senior shares the weekly report.
create function private.caregiver_sees_report(p_senior uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_linked(p_senior, 'caregiver')
    and private.has_plus(p_senior)
    and exists (
      select 1 from public.seniors where profile_id = p_senior and share_weekly_report
    );
$$;

-- Caregiver on Plus, and the senior shares possible falls.
create function private.caregiver_sees_falls(p_senior uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_linked(p_senior, 'caregiver')
    and private.has_plus(p_senior)
    and exists (
      select 1 from public.seniors where profile_id = p_senior and share_fall_alerts
    );
$$;

-- Active link of this role, and the senior has Plus.
create function private.is_linked_plus(p_senior uuid, p_role public.link_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_linked(p_senior, p_role) and private.has_plus(p_senior);
$$;

-- Whether the signed-in user may read another profile (name, language).
create function private.can_see_profile(p_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select (select auth.uid()) as id)
  select
    -- yourself
    p_profile = me.id
    -- a senior you are actively linked to
    or private.is_linked(p_profile)
    -- someone asking for, or holding, a link to you as a senior
    or exists (
      select 1 from public.care_links
      where senior_id = me.id and member_id = p_profile and status in ('pending', 'active')
    )
    -- someone in the same senior's care team
    or exists (
      select 1 from public.care_links mine
      join public.care_links theirs on theirs.senior_id = mine.senior_id
      where mine.member_id = me.id and mine.status = 'active'
        and theirs.member_id = p_profile and theirs.status = 'active'
    )
    -- a friend, or someone who sent you a friend request
    or exists (
      select 1 from public.friendships
      where (status = 'accepted'
          and ((requester_id = me.id and addressee_id = p_profile)
            or (addressee_id = me.id and requester_id = p_profile)))
        or (status = 'pending' and addressee_id = me.id and requester_id = p_profile)
    )
  from me;
$$;

-- The programme version in force on a day: the most recently created
-- prescription that started on or before it. Null means the default routine.
-- Mirrors planOn() in lib/progress/schedule.ts.
create function private.prescription_in_force(p_senior uuid, p_date date)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.prescriptions
  where senior_id = p_senior and start_date <= p_date
  order by created_at desc, id desc
  limit 1;
$$;

create function private.is_demo_account(p_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select is_demo from public.profiles where id = p_profile), false);
$$;

-- ---------------------------------------------------------------------------
-- New users get a profile
-- ---------------------------------------------------------------------------

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, locale, is_demo)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80),
    case when new.raw_user_meta_data ->> 'locale' = 'zh-Hans' then 'zh-Hans' else 'en' end,
    -- app_metadata can only be written with the service role.
    coalesce((new.raw_app_meta_data ->> 'is_demo')::boolean, false)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Auth may write app_metadata after creating the user, so keep is_demo in step.
create function private.sync_demo_flag()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set is_demo = coalesce((new.raw_app_meta_data ->> 'is_demo')::boolean, false)
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_app_metadata
  after update of raw_app_meta_data on auth.users
  for each row
  when (old.raw_app_meta_data ->> 'is_demo' is distinct from new.raw_app_meta_data ->> 'is_demo')
  execute function private.sync_demo_flag();

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Codes
-- ---------------------------------------------------------------------------

create function private.new_friend_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  candidate text;
begin
  loop
    candidate := private.random_code();
    exit when not exists (select 1 from public.seniors where friend_code = candidate);
  end loop;
  return candidate;
end;
$$;

create function private.new_link_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  candidate text;
begin
  loop
    candidate := private.random_code();
    exit when not exists (select 1 from public.senior_link_codes where code = candidate);
  end loop;
  return candidate;
end;
$$;

create function private.seniors_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.senior_link_codes (senior_id, code) values (new.profile_id, private.new_link_code());
  return new;
end;
$$;

-- Every senior gets a friend code and a link code.
alter table public.seniors alter column friend_code set default private.new_friend_code();

create trigger seniors_link_code after insert on public.seniors
  for each row execute function private.seniors_after_insert();

-- ---------------------------------------------------------------------------
-- Session integrity
--
-- Clients can only write the columns granted to them (see the RLS migration),
-- so a new session always gets today's date, server timestamps and
-- source = 'manual'. These triggers add the rules that grants can't express.
-- ---------------------------------------------------------------------------

create function private.sessions_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.prescription_id is null then
    new.prescription_id := private.prescription_in_force(new.senior_id, new.local_date);
  end if;
  -- A session left open on an earlier day is abandoned.
  if new.status = 'in_progress' then
    update public.sessions
    set status = 'incomplete', ended_at = now()
    where senior_id = new.senior_id and status = 'in_progress' and local_date < new.local_date;
  end if;
  return new;
end;
$$;

create function private.sessions_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'in_progress' then
    raise exception 'session_finished' using hint = 'A finished session cannot be changed.';
  end if;
  if new.status = 'complete'
    and not exists (select 1 from public.session_exercises where session_id = new.id) then
    raise exception 'session_empty' using hint = 'End it as incomplete instead.';
  end if;
  if new.status <> 'in_progress' then
    new.ended_at := coalesce(new.ended_at, now());
  end if;
  return new;
end;
$$;

create trigger sessions_insert before insert on public.sessions
  for each row execute function private.sessions_before_insert();
create trigger sessions_update before update on public.sessions
  for each row execute function private.sessions_before_update();

-- ---------------------------------------------------------------------------
-- Other server-filled columns
-- ---------------------------------------------------------------------------

create function private.senior_clinical_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  new.updated_at := now();
  return new;
end;
$$;

create trigger senior_clinical_stamp before insert or update on public.senior_clinical
  for each row execute function private.senior_clinical_stamp();

-- When a visit is completed, record when, and the start of the period its
-- summary covers: the last completed visit, or the day the senior's programme
-- began (the starter routine counts).
create function private.visits_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status <> 'completed') then
    new.completed_at := coalesce(new.completed_at, now());
    new.period_start := coalesce(
      (
        select max((completed_at at time zone 'Asia/Singapore')::date)
        from public.visits
        where senior_id = new.senior_id and status = 'completed' and id <> new.id
      ),
      (select (created_at at time zone 'Asia/Singapore')::date
       from public.seniors where profile_id = new.senior_id)
    );
  elsif new.status <> 'completed' then
    new.completed_at := null;
    new.period_start := null;
  end if;
  return new;
end;
$$;

create trigger visits_write before insert or update on public.visits
  for each row execute function private.visits_before_write();

-- At most one nudge per caregiver per senior per Singapore day.
create function private.nudges_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.nudges
    where senior_id = new.senior_id
      and sender_id is not distinct from new.sender_id
      and (created_at at time zone 'Asia/Singapore')::date = private.sg_today()
  ) then
    raise exception 'nudge_rate_limited' using hint = 'One nudge per day.';
  end if;
  return new;
end;
$$;

create trigger nudges_rate_limit before insert on public.nudges
  for each row execute function private.nudges_rate_limit();

-- ---------------------------------------------------------------------------
-- Demo isolation
--
-- Fake records only ever belong to demo seniors, and demo accounts can never
-- link to or befriend real ones, so a real user can never see fake data.
-- ---------------------------------------------------------------------------

create function private.reject_fake_for_real_senior()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_senior uuid;
begin
  if new.source <> 'fake' then
    return new;
  end if;
  if tg_table_name = 'session_exercises' then
    select senior_id into v_senior from public.sessions where id = new.session_id;
  else
    v_senior := (to_jsonb(new) ->> 'senior_id')::uuid;
  end if;
  if not private.is_demo_account(v_senior) then
    raise exception 'fake_data_for_real_account'
      using hint = 'Fake records are only allowed on demo accounts.';
  end if;
  return new;
end;
$$;

create trigger reject_fake before insert or update on public.sessions
  for each row execute function private.reject_fake_for_real_senior();
create trigger reject_fake before insert or update on public.session_exercises
  for each row execute function private.reject_fake_for_real_senior();
create trigger reject_fake before insert or update on public.daily_activity
  for each row execute function private.reject_fake_for_real_senior();
create trigger reject_fake before insert or update on public.fall_events
  for each row execute function private.reject_fake_for_real_senior();
create trigger reject_fake before insert or update on public.sleeve_devices
  for each row execute function private.reject_fake_for_real_senior();
create trigger reject_fake before insert or update on public.alerts
  for each row execute function private.reject_fake_for_real_senior();

create function private.reject_demo_mixing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  a uuid;
  b uuid;
begin
  if tg_table_name = 'care_links' then
    a := new.senior_id;
    b := new.member_id;
  else
    a := new.requester_id;
    b := new.addressee_id;
  end if;
  if private.is_demo_account(a) <> private.is_demo_account(b) then
    raise exception 'demo_mixing'
      using hint = 'Demo accounts can only connect to other demo accounts.';
  end if;
  return new;
end;
$$;

create trigger reject_demo_mixing before insert or update on public.care_links
  for each row execute function private.reject_demo_mixing();
create trigger reject_demo_mixing before insert or update on public.friendships
  for each row execute function private.reject_demo_mixing();
