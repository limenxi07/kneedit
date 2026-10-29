-- Demo only: a caregiver on a demo account pretends the sleeve noticed a
-- possible fall, so the alerts list (and, from Phase 7, the fall push) can be
-- tried without hardware. It writes a fake fall event and its alert, so it is
-- refused unless both the caller and the senior are demo accounts.
create function public.simulate_possible_fall(p_senior uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_alert uuid;
begin
  if not private.is_linked(p_senior, 'caregiver') then
    raise exception 'not_allowed';
  end if;
  if not (private.is_demo_account(v_me) and private.is_demo_account(p_senior)) then
    raise exception 'demo_only';
  end if;

  insert into public.fall_events (senior_id, details, source)
  values (p_senior, '{"simulated": true}', 'fake');
  insert into public.alerts (senior_id, kind, details, source)
  values (p_senior, 'possible_fall', '{"simulated": true}', 'fake')
  returning id into v_alert;
  return v_alert;
end;
$$;

revoke execute on function public.simulate_possible_fall(uuid) from public, anon;
grant execute on function public.simulate_possible_fall(uuid) to authenticated;
