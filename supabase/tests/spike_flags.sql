begin;

create extension if not exists pgtap with schema extensions;

create function pg_temp.h(bigint) returns text language sql immutable as $$ select lpad(to_hex($1), 64, '0') $$;

-- Each scenario starts from an empty table: the spike rule counts per country and year, and the landing counter
-- counts the whole active year, so leftovers would make the expectations unreadable.
create function pg_temp.reset_data() returns void language plpgsql as $$
begin
  truncate table public.responses, public.score_change_log restart identity cascade;
end;
$$;

create function pg_temp.set_season(p_launch date, p_intake date) returns void language sql as $$
  update public.season_config set public_launch_date = p_launch, intake_opens_on = p_intake where id;
$$;

-- A real create through the RPC, so the spike step runs exactly where it does in production.
create function pg_temp.create_survey(
  p_id bigint,
  p_country text,
  p_average numeric default 4.0,
  p_year integer default 2026
) returns jsonb language sql as $$
  select public.create_response_for_identity(
    pg_temp.h(p_id), p_year,
    false, p_country, p_country,
    'nawa_director', 'direct_studies', 'science-096',
    '0613', null,
    'final_certificate', 'school_leaver',
    p_average, 5, 'none',
    'submitted', current_date
  );
$$;

-- Directly inserted history and peer surveys: the RPC is bypassed on purpose, so these rows never trigger a flag.
create function pg_temp.seed_rows(
  p_base bigint,
  p_country text,
  p_year integer,
  p_count integer,
  p_score numeric,
  p_age interval,
  p_step numeric default 0,
  p_suspicious boolean default false
) returns void language sql as $$
  insert into public.responses (
    identity_hash, intake_year, has_polish_citizenship, ranking_country, school_country,
    scholarship_track, study_route, target_university, study_field,
    grade_basis, applicant_kind, average_grade, maximum_grade, grade_percentage,
    polish_school_level, nawa_orientation_score, current_status, status_changed_at,
    is_suspicious, created_at
  )
  select
    pg_temp.h(p_base + g), p_year, false, p_country, p_country,
    'nawa_director', 'direct_studies', 'science-096', '0613',
    'final_certificate', 'school_leaver', 4.0, 5, 80,
    'none', p_score + (g - 1) * p_step, 'submitted', current_date,
    p_suspicious, now() - p_age
  from generate_series(1, p_count) as g;
$$;

-- The review statements documented in docs/architecture.md, with the group key as parameters.
create function pg_temp.clear_spike_group(p_year integer, p_country text, p_hour timestamptz)
returns integer language sql as $$
  with cleared as (
    update public.responses
    set is_suspicious = false,
        spike_reviewed_at = now()
    where intake_year = p_year
      and ranking_country = p_country
      and created_at >= p_hour
      and created_at < p_hour + interval '1 hour'
      and spike_flagged_at is not null
      and spike_reviewed_at is null
    returning 1
  )
  select count(*)::integer from cleared;
$$;

create function pg_temp.keep_spike_group(p_year integer, p_country text, p_hour timestamptz)
returns integer language sql as $$
  with kept as (
    update public.responses
    set spike_reviewed_at = now()
    where intake_year = p_year
      and ranking_country = p_country
      and created_at >= p_hour
      and created_at < p_hour + interval '1 hour'
      and spike_flagged_at is not null
      and spike_reviewed_at is null
    returning 1
  )
  select count(*)::integer from kept;
$$;

select plan(29);

-- ---------------------------------------------------------------------------
-- A1: no launch date, so nothing is flagged even for a large burst.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.set_season(null, current_date - 30);

select pg_temp.create_survey(300000000 + g, 'UA') from generate_series(1, 30) as g;

select is(
  (select count(*)::integer from public.responses where is_suspicious),
  0,
  'A1: 30 surveys in an hour are not flagged while public_launch_date is null'
);
select is(
  (select count(*)::integer from public.responses where spike_flagged_at is not null),
  0,
  'A1: no survey carries a spike flag while public_launch_date is null'
);

-- ---------------------------------------------------------------------------
-- A2: the first seven days after the launch are quiet.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.set_season(current_date - 3, current_date - 30);

select pg_temp.create_survey(301000000 + g, 'UA') from generate_series(1, 30) as g;

select is(
  (select count(*)::integer from public.responses where is_suspicious),
  0,
  'A2: 30 surveys in an hour are not flagged on day 3 after the launch'
);
select is(
  (select count(*)::integer from public.responses where spike_flagged_at is not null),
  0,
  'A2: no survey carries a spike flag on day 3 after the launch'
);

-- ---------------------------------------------------------------------------
-- A3: no history, so the floor of ten applies; the eleventh survey flags the hour.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.set_season(current_date - 30, current_date - 10);

select pg_temp.create_survey(302000000 + g, 'UA') from generate_series(1, 10) as g;

select is(
  (select count(*)::integer from public.responses where is_suspicious),
  0,
  'A3: the first ten surveys of an hour are not flagged'
);

select pg_temp.create_survey(302000011, 'UA');

select is(
  (select count(*)::integer from public.responses where is_suspicious),
  11,
  'A3: the eleventh survey flags all eleven surveys of the hour'
);
select is(
  (select count(*)::integer from public.responses where spike_flagged_at is not null),
  11,
  'A3: every flagged survey gets spike_flagged_at'
);
select is(
  (select count(*)::integer from public.responses where spike_reviewed_at is not null),
  0,
  'A3: a fresh flag is not marked as reviewed'
);

-- ---------------------------------------------------------------------------
-- A4: a busy country needs more than max(10, 5 x its hourly average).
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.set_season(current_date - 30, current_date - 10);

-- 1344 surveys in the 14 days before the last hour: 1344 / 336 = 4 per hour, so the threshold is 20.
select pg_temp.seed_rows(303000000, 'LT', 2026, 1344, 50, interval '2 hours');

select pg_temp.create_survey(303010000 + g, 'LT') from generate_series(1, 20) as g;

select is(
  (select count(*)::integer from public.responses where is_suspicious),
  0,
  'A4: 20 surveys in an hour do not exceed 5 x the 14-day hourly average of 4'
);

select pg_temp.create_survey(303010021, 'LT');

select is(
  (select count(*)::integer from public.responses where is_suspicious),
  21,
  'A4: the 21st survey exceeds the threshold and flags the hour'
);

-- ---------------------------------------------------------------------------
-- A5: the first seven days after an intake opens are quiet.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.set_season(current_date - 300, current_date - 3);

select pg_temp.create_survey(304000000 + g, 'UA') from generate_series(1, 30) as g;

select is(
  (select count(*)::integer from public.responses where is_suspicious),
  0,
  'A5: 30 surveys in an hour are not flagged on day 3 after the intake opened'
);

-- ---------------------------------------------------------------------------
-- A6: only the spiking country and the active intake year are flagged.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.set_season(current_date - 30, current_date - 10);

select pg_temp.seed_rows(305000000, 'BY', 2026, 20, 60, interval '0');
select pg_temp.seed_rows(305000100, 'UA', 2025, 20, 60, interval '0');

select pg_temp.create_survey(305000200 + g, 'UA') from generate_series(1, 11) as g;

select is(
  (select count(*)::integer
   from public.responses
   where intake_year = 2026 and ranking_country = 'UA' and is_suspicious),
  11,
  'A6: the spike flags the active intake year of the spiking country'
);
select is(
  (select count(*)::integer
   from public.responses
   where intake_year = 2026 and ranking_country = 'BY' and is_suspicious),
  0,
  'A6: surveys of another country created in the same hour are not flagged'
);
select is(
  (select count(*)::integer
   from public.responses
   where intake_year = 2025 and ranking_country = 'UA' and is_suspicious),
  0,
  'A6: surveys of another intake year created in the same hour are not flagged'
);

-- ---------------------------------------------------------------------------
-- A7: a flagged owner still sees a position against the unflagged cohort.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.set_season(current_date - 30, current_date - 10);

-- Twelve valid peers with distinct scores 10, 20, ... 120, older than the last hour.
select pg_temp.seed_rows(306000000, 'UA', 2026, 12, 10, interval '2 hours', 10);

-- Eleven surveys in the last hour: the last one triggers the spike and flags all eleven (score 72).
select pg_temp.create_survey(306010000 + g, 'UA') from generate_series(1, 11) as g;

select is(
  (select is_suspicious
   from public.responses
   where identity_hash = pg_temp.h(306010011) and intake_year = 2026),
  true,
  'A7: the survey of the hour is flagged'
);

create temporary table owner_statistics(result jsonb) on commit drop;
insert into owner_statistics
select public.get_current_statistics(pg_temp.h(306010011), 2026);

select is(
  (select (result->>'rankPosition')::integer from owner_statistics),
  6,
  'A7: the flagged owner keeps a position computed from the 12 unflagged surveys'
);
select is(
  (select (result->>'rankTotal')::integer from owner_statistics),
  12,
  'A7: the flagged survey is not part of the owner''s comparison cohort'
);
select is(
  (public.get_intake_summary()->>'responseCount')::integer,
  12,
  'A7: flagged surveys are excluded from the landing counter'
);

-- ---------------------------------------------------------------------------
-- A8: a cleared group stays unflagged; only unreviewed surveys can be flagged again.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.set_season(current_date - 30, current_date - 10);

select pg_temp.create_survey(307000000 + g, 'UA') from generate_series(1, 11) as g;

create temporary table clear_result(count integer) on commit drop;
insert into clear_result values (pg_temp.clear_spike_group(2026, 'UA', date_trunc('hour', now())));

select is(
  (select count from clear_result),
  11,
  'A8: the documented clear statement clears the flagged group'
);
select is(
  (select count(*)::integer
   from public.responses
   where intake_year = 2026 and ranking_country = 'UA' and is_suspicious),
  0,
  'A8: cleared surveys are unflagged'
);
select is(
  (select count(*)::integer
   from public.responses
   where intake_year = 2026 and ranking_country = 'UA' and spike_reviewed_at is not null),
  11,
  'A8: cleared surveys are marked as reviewed'
);

select pg_temp.create_survey(307000012, 'UA');

select is(
  (select spike_flagged_at is not null
   from public.responses
   where identity_hash = pg_temp.h(307000012) and intake_year = 2026),
  true,
  'A8: a survey arriving while the burst continues is flagged'
);
select is(
  (select count(*)::integer
   from public.responses
   where intake_year = 2026 and ranking_country = 'UA' and is_suspicious),
  1,
  'A8: only the unreviewed survey is flagged again'
);
select is(
  (select count(*)::integer
   from public.responses
   where intake_year = 2026 and ranking_country = 'UA' and spike_reviewed_at is not null),
  11,
  'A8: the cleared group stays reviewed and unflagged'
);

-- ---------------------------------------------------------------------------
-- A9: a flag from the old status-transition rule is left alone.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.set_season(current_date - 30, current_date - 10);

select pg_temp.seed_rows(308000000, 'UA', 2026, 1, 80, interval '0', 0, true);

select pg_temp.create_survey(308010000 + g, 'UA') from generate_series(1, 11) as g;

select is(
  (select count(*)::integer
   from public.responses
   where intake_year = 2026 and ranking_country = 'UA'
     and spike_flagged_at is not null and spike_reviewed_at is null),
  11,
  'A9: the spike step flags its hour even when an old-rule flag is present'
);
select is(
  (select is_suspicious
   from public.responses
   where identity_hash = pg_temp.h(308000001) and intake_year = 2026),
  true,
  'A9: the old status-transition flag stays suspicious'
);
select is(
  (select spike_flagged_at
   from public.responses
   where identity_hash = pg_temp.h(308000001) and intake_year = 2026),
  null,
  'A9: the spike step does not add spike_flagged_at to an old-rule flag'
);

select pg_temp.clear_spike_group(2026, 'UA', date_trunc('hour', now()));

select is(
  (select is_suspicious
   from public.responses
   where identity_hash = pg_temp.h(308000001) and intake_year = 2026),
  true,
  'A9: the clear statement does not clear an old-rule flag'
);

select pg_temp.keep_spike_group(2026, 'UA', date_trunc('hour', now()));

select is(
  (select spike_reviewed_at
   from public.responses
   where identity_hash = pg_temp.h(308000001) and intake_year = 2026),
  null,
  'A9: the keep-flagged statement does not review an old-rule flag'
);

select * from finish();
rollback;
