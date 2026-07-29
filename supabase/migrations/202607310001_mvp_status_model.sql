-- MVP status model: 5 statuses, transition enforcement, moderation queue, extended statistics.

update public.responses
set current_status = case current_status
  when 'submitted' then 'submitted'
  when 'formal_review_in_progress' then 'submitted'
  when 'correction_requested' then 'submitted'
  when 'formal_review_completed' then 'formal_review_positive'
  when 'merit_review_in_progress' then 'formal_review_positive'
  when 'merit_review_positive' then 'merit_review_positive'
  when 'merit_review_negative' then 'merit_review_negative'
  when 'awaiting_decision' then 'merit_review_positive'
  when 'scholarship_awarded' then 'scholarship_awarded'
  when 'scholarship_not_awarded' then 'merit_review_positive'
  else 'submitted'
end;

alter table public.responses drop constraint if exists responses_current_status_check;
alter table public.responses add constraint responses_current_status_check check (
  current_status in (
    'submitted',
    'formal_review_positive',
    'merit_review_positive',
    'merit_review_negative',
    'scholarship_awarded'
  )
);

create table if not exists public.status_change_requests (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null references public.responses (telegram_user_id) on delete cascade,
  from_status text not null,
  to_status text not null,
  reason text,
  decision text not null default 'pending' check (decision in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists status_change_requests_telegram_user_id_idx
  on public.status_change_requests (telegram_user_id, created_at desc);

alter table public.status_change_requests enable row level security;

create table if not exists public.response_audit_log (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null,
  response_id uuid,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists response_audit_log_telegram_user_id_idx
  on public.response_audit_log (telegram_user_id, created_at desc);

alter table public.response_audit_log enable row level security;

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null,
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists product_events_telegram_user_id_idx
  on public.product_events (telegram_user_id, created_at desc);

alter table public.product_events enable row level security;

create or replace function public.is_allowed_status_transition(p_from text, p_to text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when p_from = p_to then true
    when p_from = 'submitted' and p_to = 'formal_review_positive' then true
    when p_from = 'formal_review_positive' and p_to in ('merit_review_positive', 'merit_review_negative') then true
    when p_from = 'merit_review_positive' and p_to = 'scholarship_awarded' then true
    else false
  end;
$$;

create or replace function public.compute_group_progress(
  p_scholarship_track text,
  p_ranking_country text
)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'submitted', count(*) filter (where current_status = 'submitted'),
    'formalPositive', count(*) filter (where current_status = 'formal_review_positive'),
    'meritPositive', count(*) filter (where current_status = 'merit_review_positive'),
    'scholarshipAwarded', count(*) filter (where current_status = 'scholarship_awarded')
  )
  from public.responses
  where not is_suspicious
    and scholarship_track = p_scholarship_track
    and ranking_country = p_ranking_country;
$$;

create or replace function public.compute_reported_merit_outcomes(
  p_scholarship_track text,
  p_ranking_country text
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = pg_catalog
as $$
declare
  v_positive_count bigint;
  v_negative_count bigint;
  v_lowest_positive numeric;
  v_highest_negative numeric;
  v_boundary_state text;
begin
  select
    count(*) filter (where current_status = 'merit_review_positive'),
    count(*) filter (where current_status = 'merit_review_negative'),
    min(case when current_status = 'merit_review_positive' then nawa_orientation_score end),
    max(case when current_status = 'merit_review_negative' then nawa_orientation_score end)
  into v_positive_count, v_negative_count, v_lowest_positive, v_highest_negative
  from public.responses
  where not is_suspicious
    and scholarship_track = p_scholarship_track
    and ranking_country = p_ranking_country
    and nawa_orientation_score is not null;

  if coalesce(v_positive_count, 0) + coalesce(v_negative_count, 0) < 1 then
    v_boundary_state := 'insufficient_data';
  elsif coalesce(v_positive_count, 0) < 3 then
    v_boundary_state := 'positive_only';
  elsif coalesce(v_negative_count, 0) < 3 then
    v_boundary_state := 'positive_only';
  elsif v_highest_negative >= v_lowest_positive then
    v_boundary_state := 'overlapping_results';
  else
    v_boundary_state := 'interval';
  end if;

  return jsonb_build_object(
    'positiveCount', coalesce(v_positive_count, 0),
    'negativeCount', coalesce(v_negative_count, 0),
    'lowestReportedPositiveScore', v_lowest_positive,
    'highestReportedNegativeScore', v_highest_negative,
    'boundaryState', v_boundary_state
  );
end;
$$;

grant select, insert on table public.product_events to service_role;
grant select, insert on table public.status_change_requests to service_role;
grant select, insert on table public.response_audit_log to service_role;
