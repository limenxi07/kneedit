-- RPCs for everything a client may change beyond its own rows. Each one checks
-- who is calling, and raises a short machine-readable message (for example
-- 'invalid_code') that the app maps to translated copy.
--
-- delete_my_account() arrives with the account deletion screens in Phase 3.

-- ---------------------------------------------------------------------------
-- Linking a caregiver or physio to a senior
-- ---------------------------------------------------------------------------

create function private.normalize_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
$$;

-- A member redeems a senior's link code. Returns only the link id: the member
-- learns nothing about the senior until the senior approves.
create function public.redeem_link_code(p_code text, p_role public.link_role)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_senior uuid;
  v_link uuid;
begin
  if v_me is null then
    raise exception 'not_signed_in';
  end if;
  select senior_id into v_senior
  from public.senior_link_codes where code = private.normalize_code(p_code);
  if v_senior is null then
    raise exception 'invalid_code';
  end if;
  if v_senior = v_me then
    raise exception 'own_code';
  end if;

  select id into v_link from public.care_links
  where senior_id = v_senior and member_id = v_me and status <> 'revoked';
  if v_link is not null then
    return v_link;
  end if;

  insert into public.care_links (senior_id, member_id, role)
  values (v_senior, v_me, p_role)
  returning id into v_link;
  return v_link;
end;
$$;

-- The senior approves or declines a pending request. Approving a physio
-- replaces any current physio, since a senior has one at a time.
create function public.respond_to_link(p_link uuid, p_accept boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_link public.care_links;
begin
  select * into v_link from public.care_links
  where id = p_link and senior_id = v_me and status = 'pending'
  for update;
  if v_link.id is null then
    raise exception 'not_found';
  end if;

  if p_accept then
    if v_link.role = 'physio' then
      update public.care_links
      set status = 'revoked', revoked_at = now(), revoked_by = v_me
      where senior_id = v_me and role = 'physio' and status = 'active';
    end if;
    update public.care_links
    set status = 'active', responded_at = now()
    where id = p_link;
  else
    update public.care_links
    set status = 'revoked', responded_at = now(), revoked_at = now(), revoked_by = v_me
    where id = p_link;
  end if;
end;
$$;

-- Either end ends a link (or cancels a pending request). Takes effect at once.
create function public.revoke_link(p_link uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
begin
  update public.care_links
  set status = 'revoked', revoked_at = now(), revoked_by = v_me
  where id = p_link and status <> 'revoked' and v_me in (senior_id, member_id);
  if not found then
    raise exception 'not_found';
  end if;
end;
$$;

-- A new link code for the senior. Existing links and pending requests stay.
create function public.regenerate_link_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_code text := private.new_link_code();
begin
  update public.senior_link_codes
  set code = v_code, created_at = now()
  where senior_id = auth.uid();
  if not found then
    raise exception 'not_a_senior';
  end if;
  return v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Friends (seniors only)
-- ---------------------------------------------------------------------------

create function public.send_friend_request(p_friend_code text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_them uuid;
  v_row public.friendships;
begin
  if not exists (select 1 from public.seniors where profile_id = v_me) then
    raise exception 'not_a_senior';
  end if;
  select profile_id into v_them
  from public.seniors where friend_code = private.normalize_code(p_friend_code);
  if v_them is null then
    raise exception 'invalid_code';
  end if;
  if v_them = v_me then
    raise exception 'own_code';
  end if;

  select * into v_row from public.friendships
  where least(requester_id, addressee_id) = least(v_me, v_them)
    and greatest(requester_id, addressee_id) = greatest(v_me, v_them)
  for update;

  if v_row.id is null then
    insert into public.friendships (requester_id, addressee_id)
    values (v_me, v_them)
    returning id into v_row.id;
  elsif v_row.requester_id = v_them and v_row.status <> 'accepted' then
    -- They asked first, so asking back accepts.
    update public.friendships
    set status = 'accepted', responded_at = now()
    where id = v_row.id;
  end if;
  return v_row.id;
end;
$$;

create function public.respond_to_friend_request(p_friendship uuid, p_accept boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.friendships
  set status = case when p_accept then 'accepted'::public.friendship_status
                    else 'dismissed'::public.friendship_status end,
      responded_at = now()
  where id = p_friendship and addressee_id = auth.uid() and status = 'pending';
  if not found then
    raise exception 'not_found';
  end if;
end;
$$;

-- Either side removes a friend, or the requester cancels a request.
create function public.remove_friend(p_friendship uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  delete from public.friendships
  where id = p_friendship and auth.uid() in (requester_id, addressee_id);
  if not found then
    raise exception 'not_found';
  end if;
end;
$$;

-- The caller's friends and requests. A request the caller sent shows as
-- pending, with no name, until it is accepted, even if it was dismissed.
create function public.list_friendships()
returns table (
  friendship_id uuid,
  friend_id uuid,
  display_name text,
  direction text,
  status public.friendship_status
)
language sql
stable
security definer
set search_path = ''
as $$
  select f.id,
    case when f.status = 'accepted' then f.addressee_id end,
    case when f.status = 'accepted' then p.display_name end,
    'outgoing',
    case when f.status = 'accepted' then 'accepted'::public.friendship_status
         else 'pending'::public.friendship_status end
  from public.friendships f
  join public.profiles p on p.id = f.addressee_id
  where f.requester_id = (select auth.uid())
  union all
  select f.id, f.requester_id, p.display_name, 'incoming', f.status
  from public.friendships f
  join public.profiles p on p.id = f.requester_id
  where f.addressee_id = (select auth.uid()) and f.status <> 'dismissed';
$$;

-- The caller plus accepted friends who show on the leaderboard. Only names,
-- streaks and this week's rate leave the database; lib/progress sorts them.
-- A rate from an earlier week counts as 0, so the board resets on Monday.
create function public.get_friend_leaderboard()
returns table (
  senior_id uuid,
  display_name text,
  streak integer,
  week_rate integer,
  includes_sample_data boolean,
  is_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select (select auth.uid()) as id),
  week as (select private.sg_today() - (extract(isodow from private.sg_today())::int - 1) as start),
  members as (
    select me.id as senior_id, true as is_me
    from me join public.seniors s on s.profile_id = me.id
    union
    select case when f.requester_id = me.id then f.addressee_id else f.requester_id end, false
    from me
    join public.friendships f
      on f.status = 'accepted' and me.id in (f.requester_id, f.addressee_id)
    join public.seniors s
      on s.profile_id = case when f.requester_id = me.id then f.addressee_id else f.requester_id end
    where s.show_on_leaderboard
  )
  select m.senior_id,
    p.display_name,
    coalesce(st.streak, 0),
    case when st.week_start = week.start then st.week_rate else 0 end,
    coalesce(st.includes_sample_data, false),
    m.is_me
  from members m
  cross join week
  join public.profiles p on p.id = m.senior_id
  left join public.senior_stats st on st.senior_id = m.senior_id;
$$;

-- ---------------------------------------------------------------------------
-- Plan (mock checkout)
-- ---------------------------------------------------------------------------

-- The senior or an active caregiver changes the plan. While the paywall is
-- off nothing changes, since everything is unlocked: returns whether it did.
create function public.mock_set_plan(p_senior uuid, p_plan public.plan_tier)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not (p_senior = auth.uid() or private.is_linked(p_senior, 'caregiver')) then
    raise exception 'not_allowed';
  end if;
  if not coalesce((select paywall_enabled from public.app_settings), false) then
    return false;
  end if;
  update public.seniors set plan = p_plan where profile_id = p_senior;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Prescribing
-- ---------------------------------------------------------------------------

-- The senior's physio saves a new programme version. It starts today or
-- later, so history never changes. p_items is a list of
-- { exercise_id, reps, frequency, weekday? } in order; weekday (1 Monday to
-- 7 Sunday) is required for by_weekday and must be absent otherwise.
create function public.save_prescription(
  p_senior uuid,
  p_start_date date,
  p_variation public.prescription_variation,
  p_items jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not private.is_linked(p_senior, 'physio') then
    raise exception 'not_allowed';
  end if;
  if p_start_date < private.sg_today() then
    raise exception 'start_in_past';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'no_items';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) item
    where (p_variation = 'by_weekday') <> (item ? 'weekday' and item -> 'weekday' <> 'null')
  ) then
    raise exception 'weekday_mismatch';
  end if;

  -- clock_timestamp(), not now(), so versions saved in one transaction still
  -- have a clear order (prescription_in_force picks the latest).
  update public.prescriptions
  set replaced_at = clock_timestamp()
  where senior_id = p_senior and replaced_at is null;

  insert into public.prescriptions (senior_id, physio_id, start_date, variation, created_at)
  values (p_senior, auth.uid(), p_start_date, p_variation, clock_timestamp())
  returning id into v_id;

  insert into public.prescription_items (prescription_id, exercise_id, position, reps, frequency, weekday)
  select v_id,
    item ->> 'exercise_id',
    row_number() over (partition by item ->> 'weekday' order by ord),
    (item ->> 'reps')::integer,
    coalesce(item ->> 'frequency', 'daily')::public.frequency,
    (item ->> 'weekday')::smallint
  from jsonb_array_elements(p_items) with ordinality as t(item, ord);

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public, private from public, anon;

grant execute on function
  public.redeem_link_code(text, public.link_role),
  public.respond_to_link(uuid, boolean),
  public.revoke_link(uuid),
  public.regenerate_link_code(),
  public.send_friend_request(text),
  public.respond_to_friend_request(uuid, boolean),
  public.remove_friend(uuid),
  public.list_friendships(),
  public.get_friend_leaderboard(),
  public.mock_set_plan(uuid, public.plan_tier),
  public.save_prescription(uuid, date, public.prescription_variation, jsonb)
  to authenticated;
