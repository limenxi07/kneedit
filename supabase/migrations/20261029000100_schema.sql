-- Kneedit schema: enums, tables, indexes and small utility functions.
-- Row level security, triggers and RPCs live in the migrations after this one.
-- See PLAN.md (Data model) for what each table holds and who may see it.

-- Helpers and trigger functions live in `private`, which the API does not
-- expose, so clients can only call the RPCs in `public`.
create schema private;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.record_source as enum ('fake', 'manual', 'sleeve');
create type public.link_role as enum ('caregiver', 'physio');
create type public.link_status as enum ('pending', 'active', 'revoked');
create type public.plan_tier as enum ('free', 'plus');
create type public.session_status as enum ('in_progress', 'complete', 'incomplete');
create type public.frequency as enum ('daily', 'twice_daily', 'alternate_days');
create type public.friendship_status as enum ('pending', 'accepted', 'dismissed');
create type public.visit_status as enum ('scheduled', 'completed', 'cancelled');
create type public.alert_kind as enum ('missed_days', 'possible_fall');
create type public.app_context as enum ('senior', 'caregiver', 'physio');
create type public.gender as enum ('female', 'male', 'prefer_not_to_say');
create type public.knee_side as enum ('left', 'right', 'both');
create type public.tag_kind as enum ('focus', 'position');
create type public.exercise_review_status as enum ('draft_pending_signoff', 'signed_off');
create type public.prescription_variation as enum ('same_every_day', 'by_weekday');
create type public.calibration_status as enum ('not_started', 'in_progress', 'done');
create type public.device_platform as enum ('ios', 'android', 'web');
-- A visit summary is stored in two parts so RLS can give physios on Free the
-- adherence part only (PLAN.md, "Visit summaries").
create type public.visit_summary_part as enum ('adherence', 'details');

-- ---------------------------------------------------------------------------
-- Utility functions
-- ---------------------------------------------------------------------------

-- Today's date in Singapore, the app's only timezone for now.
create function private.sg_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Singapore')::date;
$$;

-- A random 6-character code without the look-alikes 0, O, 1 and I.
create function private.random_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(6);
  code text := '';
begin
  for i in 0..5 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return code;
end;
$$;

-- { "en": "...", "zh-Hans": "..." }, both non-empty.
create function private.is_localized_text(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  -- coalesce: a null here would let a CHECK constraint pass.
  select coalesce(
    jsonb_typeof(value) = 'object'
      and jsonb_typeof(value -> 'en') = 'string'
      and jsonb_typeof(value -> 'zh-Hans') = 'string'
      and length(trim(value ->> 'en')) > 0
      and length(trim(value ->> 'zh-Hans')) > 0,
    false
  );
$$;

-- { "en": [...], "zh-Hans": [...] }, both non-empty lists of the same length.
create function private.is_localized_list(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  -- case, so the lengths are only taken once both are known to be arrays.
  select case
    when coalesce(
      jsonb_typeof(value) = 'object'
        and jsonb_typeof(value -> 'en') = 'array'
        and jsonb_typeof(value -> 'zh-Hans') = 'array',
      false
    )
    then jsonb_array_length(value -> 'en') > 0
      and jsonb_array_length(value -> 'en') = jsonb_array_length(value -> 'zh-Hans')
    else false
  end;
$$;

-- ---------------------------------------------------------------------------
-- Settings and people
-- ---------------------------------------------------------------------------

create table public.app_settings (
  id boolean primary key default true check (id),
  paywall_enabled boolean not null default false
);
comment on table public.app_settings is
  'A single row. Only a migration or the service role can change it.';
insert into public.app_settings (id, paywall_enabled) values (true, false);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 80),
  locale text not null default 'en' check (locale in ('en', 'zh-Hans')),
  timezone text not null default 'Asia/Singapore',
  is_demo boolean not null default false,
  default_context public.app_context,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.profiles.default_context is
  'Only picks the first screen after sign-in. Never used for authorisation.';
comment on column public.profiles.is_demo is
  'Set from auth app_metadata.is_demo, which only the service role can write.';

create table public.seniors (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  birth_year integer check (birth_year between 1900 and 2100),
  gender public.gender,
  plan public.plan_tier not null default 'free',
  reminder_time time not null default '09:00',
  share_weekly_report boolean not null default true,
  share_fall_alerts boolean not null default true,
  show_on_leaderboard boolean not null default true,
  friend_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.senior_link_codes (
  senior_id uuid primary key references public.seniors (profile_id) on delete cascade,
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  created_at timestamptz not null default now()
);

create table public.senior_clinical (
  senior_id uuid primary key references public.seniors (profile_id) on delete cascade,
  affected_knee public.knee_side,
  notes text not null default '' check (length(notes) <= 4000),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.care_links (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.seniors (profile_id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  role public.link_role not null,
  status public.link_status not null default 'pending',
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  check (senior_id <> member_id)
);
create unique index care_links_one_open_link
  on public.care_links (senior_id, member_id) where status <> 'revoked';
create unique index care_links_one_active_physio
  on public.care_links (senior_id) where role = 'physio' and status = 'active';
create index care_links_member on public.care_links (member_id) where status <> 'revoked';

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.seniors (profile_id) on delete cascade,
  addressee_id uuid not null references public.seniors (profile_id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);
create unique index friendships_one_per_pair on public.friendships
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee on public.friendships (addressee_id);

-- ---------------------------------------------------------------------------
-- Exercise library and programmes
-- ---------------------------------------------------------------------------

create table public.tags (
  key text primary key check (key ~ '^[a-z0-9-]+$'),
  kind public.tag_kind not null,
  label jsonb not null check (private.is_localized_text(label))
);

create table public.exercises (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name jsonb not null check (private.is_localized_text(name)),
  steps jsonb not null check (private.is_localized_list(steps)),
  default_reps integer not null check (default_reps between 1 and 100),
  focus_tag text not null references public.tags (key),
  position_tag text not null references public.tags (key),
  video_path text,
  poster_path text,
  review_status public.exercise_review_status not null default 'draft_pending_signoff',
  sort_order integer not null default 0,
  active boolean not null default true
);

create table public.default_routine_items (
  position integer primary key check (position >= 1),
  exercise_id text not null references public.exercises (id),
  reps integer not null check (reps between 1 and 100),
  frequency public.frequency not null default 'daily'
);
comment on table public.default_routine_items is
  'The Kneedit starter routine, used until a physio prescribes a programme.';

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.seniors (profile_id) on delete cascade,
  physio_id uuid references public.profiles (id) on delete set null,
  start_date date not null,
  variation public.prescription_variation not null default 'same_every_day',
  created_at timestamptz not null default now(),
  replaced_at timestamptz
);
comment on table public.prescriptions is
  'Versioned: every change inserts a new row and marks the previous one replaced. The plan in force on a day is the most recently created version that started on or before it.';
create unique index prescriptions_one_current
  on public.prescriptions (senior_id) where replaced_at is null;
create index prescriptions_senior on public.prescriptions (senior_id, created_at);

create table public.prescription_items (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions (id) on delete cascade,
  exercise_id text not null references public.exercises (id),
  position integer not null check (position >= 1),
  reps integer not null check (reps between 1 and 100),
  frequency public.frequency not null default 'daily',
  weekday smallint check (weekday between 1 and 7),
  unique nulls not distinct (prescription_id, weekday, position)
);
comment on column public.prescription_items.weekday is
  'ISO weekday (1 is Monday) for by_weekday programmes, null for same_every_day.';

-- ---------------------------------------------------------------------------
-- Exercise records
-- ---------------------------------------------------------------------------

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.seniors (profile_id) on delete cascade,
  local_date date not null default private.sg_today(),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status public.session_status not null default 'in_progress',
  prescription_id uuid references public.prescriptions (id),
  source public.record_source not null default 'manual',
  check ((status = 'in_progress') = (ended_at is null))
);
comment on column public.sessions.prescription_id is 'Null means the default routine.';
create index sessions_senior_date on public.sessions (senior_id, local_date);
create unique index sessions_one_in_progress
  on public.sessions (senior_id) where status = 'in_progress';

create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  exercise_id text not null references public.exercises (id),
  position integer not null check (position >= 1),
  reps_target integer not null check (reps_target between 1 and 100),
  reps_done integer check (reps_done between 0 and 1000),
  hurt boolean,
  easy boolean,
  form_score numeric(3, 1) check (form_score between 0 and 10),
  sensor_summary jsonb,
  completed_at timestamptz not null default now(),
  source public.record_source not null default 'manual',
  unique (session_id, position),
  -- Only the sleeve (or its fake stand-in) can score form.
  check (source <> 'manual' or (form_score is null and sensor_summary is null))
);

create table public.daily_activity (
  senior_id uuid not null references public.seniors (profile_id) on delete cascade,
  local_date date not null,
  steps integer check (steps >= 0),
  walking_minutes integer check (walking_minutes >= 0),
  active_minutes integer check (active_minutes >= 0),
  sedentary_minutes integer check (sedentary_minutes >= 0),
  sit_to_stand_count integer check (sit_to_stand_count >= 0),
  source public.record_source not null,
  primary key (senior_id, local_date)
);

create table public.fall_events (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.seniors (profile_id) on delete cascade,
  detected_at timestamptz not null default now(),
  details jsonb not null default '{}',
  source public.record_source not null
);
create index fall_events_senior on public.fall_events (senior_id, detected_at);

create table public.sleeve_devices (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.seniors (profile_id) on delete cascade,
  knee public.knee_side not null,
  firmware text,
  battery_pct integer check (battery_pct between 0 and 100),
  worn boolean not null default false,
  last_sync_at timestamptz,
  calibration_status public.calibration_status not null default 'not_started',
  source public.record_source not null
);
create index sleeve_devices_senior on public.sleeve_devices (senior_id);

-- ---------------------------------------------------------------------------
-- Derived records (written by server code only)
-- ---------------------------------------------------------------------------

create table public.senior_stats (
  senior_id uuid primary key references public.seniors (profile_id) on delete cascade,
  as_of_date date not null,
  week_start date not null,
  week_done integer not null default 0,
  week_prescribed integer not null default 0,
  week_rate integer not null default 0 check (week_rate between 0 and 100),
  streak integer not null default 0,
  month_sessions integer not null default 0,
  missed_days_this_week integer not null default 0,
  consecutive_missed_days integer not null default 0,
  includes_sample_data boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.leaderboard_weeks (
  senior_id uuid not null references public.seniors (profile_id) on delete cascade,
  week_start date not null,
  week_rate integer not null check (week_rate between 0 and 100),
  streak integer not null,
  includes_sample_data boolean not null default false,
  primary key (senior_id, week_start)
);

create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.seniors (profile_id) on delete cascade,
  week_start date not null,
  report jsonb not null,
  includes_sample_data boolean not null default false,
  generated_at timestamptz not null default now(),
  unique (senior_id, week_start)
);

-- ---------------------------------------------------------------------------
-- Care team records
-- ---------------------------------------------------------------------------

create table public.caregiver_notes (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.seniors (profile_id) on delete cascade,
  author_id uuid default auth.uid() references public.profiles (id) on delete set null,
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
comment on column public.caregiver_notes.author_id is 'Null once the author deletes their account ("Former caregiver").';
create index caregiver_notes_senior on public.caregiver_notes (senior_id, created_at);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.seniors (profile_id) on delete cascade,
  physio_id uuid default auth.uid() references public.profiles (id) on delete set null,
  scheduled_at timestamptz not null,
  duration_min integer not null default 30 check (duration_min between 5 and 480),
  location text not null default '' check (length(location) <= 200),
  status public.visit_status not null default 'scheduled',
  completed_at timestamptz,
  period_start date,
  created_at timestamptz not null default now()
);
comment on column public.visits.physio_id is 'Null once the physio deletes their account ("Former physiotherapist").';
create index visits_senior on public.visits (senior_id, scheduled_at);
create index visits_physio on public.visits (physio_id, scheduled_at);

create table public.visit_summaries (
  visit_id uuid not null references public.visits (id) on delete cascade,
  part public.visit_summary_part not null,
  body jsonb not null,
  includes_sample_data boolean not null default false,
  generated_at timestamptz not null default now(),
  primary key (visit_id, part)
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.seniors (profile_id) on delete cascade,
  kind public.alert_kind not null,
  details jsonb not null default '{}',
  source public.record_source not null,
  created_at timestamptz not null default now()
);
create index alerts_senior on public.alerts (senior_id, created_at);

create table public.nudges (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.seniors (profile_id) on delete cascade,
  sender_id uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);
create index nudges_senior on public.nudges (senior_id, created_at);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  token text not null unique,
  platform public.device_platform not null,
  created_at timestamptz not null default now()
);
create index push_tokens_profile on public.push_tokens (profile_id);
