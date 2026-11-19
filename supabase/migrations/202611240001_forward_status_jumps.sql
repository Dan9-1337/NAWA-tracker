--
-- Forward status jumps.
--
-- The ladder is submitted -> formal_review_positive -> merit_review_positive|merit_review_negative ->
-- scholarship_awarded|scholarship_not_awarded. People who join after the results are out should not have to
-- replay every earlier stage, so any move to a *later* stage is allowed. Going back stays invalid, a negative
-- merit review ends the ladder, and the two seat decisions can still be corrected into each other
-- (handled in update_current_response).
--

create function public.status_rank(p_status text) returns integer
    language sql immutable
    set search_path to 'pg_catalog'
    as $$
  select case p_status
    when 'submitted' then 0
    when 'formal_review_positive' then 1
    when 'merit_review_positive' then 2
    when 'merit_review_negative' then 2
    when 'scholarship_awarded' then 3
    when 'scholarship_not_awarded' then 3
  end;
$$;

create or replace function public.is_allowed_status_transition(p_from text, p_to text) returns boolean
    language sql immutable
    set search_path to 'pg_catalog'
    as $$
  select case
    when p_from = p_to then true
    when p_from in ('submitted', 'formal_review_positive', 'merit_review_positive')
      and public.status_rank(p_to) > public.status_rank(p_from) then true
    else false
  end;
$$;

revoke all on function public.status_rank(text) from public, anon, authenticated, service_role;
