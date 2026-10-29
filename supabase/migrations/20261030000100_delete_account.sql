-- Account deletion (PLAN.md, Account deletion). The caller's auth user is
-- deleted, and the foreign keys do the rest in the same transaction:
-- everything about a senior cascades away, while what a caregiver or physio
-- wrote about a senior stays with no author (Q10).

-- p_confirmation is the word the user typed: DELETE in English or 删除 in
-- Chinese. The sign-in must be under 24 hours old, and demo accounts are
-- reset by the seed script instead.
create function public.delete_my_account(p_confirmation text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_word text := trim(coalesce(p_confirmation, ''));
  v_last_sign_in timestamptz;
begin
  if v_me is null then
    raise exception 'not_signed_in';
  end if;
  if upper(v_word) <> 'DELETE' and v_word <> '删除' then
    raise exception 'confirmation_mismatch';
  end if;
  if private.is_demo_account(v_me) then
    raise exception 'demo_account';
  end if;

  select last_sign_in_at into v_last_sign_in from auth.users where id = v_me;
  if v_last_sign_in is null or v_last_sign_in < now() - interval '24 hours' then
    raise exception 'reauth_required';
  end if;

  delete from auth.users where id = v_me;
end;
$$;

revoke execute on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;
