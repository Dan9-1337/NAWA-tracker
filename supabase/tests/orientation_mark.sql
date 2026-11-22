--
-- "Ориентир 2026" SQL tests (docs/adr/0017, task 014).
--
-- The mark is the lowest score_snapshot among counted 2026 Director holder reports of the caller's citizenship
-- country, with n and — only with the full distribution request — the ascending holder score list. No minimum:
-- n can be 1. Suspicious surveys, other countries and other intake years are left out.
--

begin;

create extension if not exists pgtap with schema extensions;

create function pg_temp.h(bigint) returns text language sql immutable as $$ select lpad(to_hex($1), 64, '0') $$;

create function pg_temp.reset_data() returns void language plpgsql as $$
begin
  truncate table public.responses, public.scholarship_reports, public.score_change_log restart identity cascade;
end;
$$;

-- A real survey through the API RPC, so the score and the response key are exactly production ones.
create function pg_temp.create_survey(
  p_id bigint,
  p_country text,
  p_intake integer default 2026,
  p_average numeric default 4,
  p_maximum numeric default 5
) returns void language sql as $$
  select public.create_response_for_identity(
    pg_temp.h(p_id), p_intake,
    false, p_country, p_country,
    'nawa_director', 'direct_studies', 'science-096',
    '0613', null,
    'final_certificate', 'school_leaver',
    p_average, p_maximum, 'none',
    'submitted', current_date
  );
$$;

create function pg_temp.update_survey(p_id bigint, p_country text, p_average numeric, p_maximum numeric) returns jsonb
language sql as $$
  select public.update_current_response(
    pg_temp.h(p_id), 2026,
    false, p_country, p_country,
    'nawa_director', 'direct_studies', 'science-096',
    '0613', null,
    'final_certificate', 'school_leaver',
    p_average, p_maximum, 'none',
    'submitted', current_date
  );
$$;

-- Direct inserts set the snapshot the test needs; the mark reads the snapshot, never the survey's live score.
create function pg_temp.seed_report(p_id bigint, p_snapshot numeric, p_intake integer default 2026) returns void
language sql as $$
  insert into public.scholarship_reports (
    identity_hash, intake_year, score_snapshot, study_route,
    programme_id, programme_isced, university_id
  ) values (
    pg_temp.h(p_id), p_intake, p_snapshot, 'direct_studies',
    'informatyka', '0613', 'science-096'
  );
$$;

create function pg_temp.mark(p_id bigint, p_scores boolean default false) returns jsonb language sql as $$
  select public.get_orientation_mark(pg_temp.h(p_id), 2026, p_scores);
$$;

select plan(28);

-- ---------------------------------------------------------------------------
-- A1: three BY holders at 72, 80 and 95; another country's holder is not counted.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.create_survey(500000001, 'BY');
select pg_temp.create_survey(500000002, 'BY');
select pg_temp.create_survey(500000003, 'BY');
select pg_temp.create_survey(500000004, 'BY');
select pg_temp.create_survey(500000005, 'UA');

select pg_temp.seed_report(500000002, 72);
select pg_temp.seed_report(500000003, 80);
select pg_temp.seed_report(500000004, 95);
select pg_temp.seed_report(500000005, 99);

select is(
  (pg_temp.mark(500000001) ->> 'n')::integer,
  3,
  'A1: three BY holder reports are counted, the UA one is not'
);
select is(
  (pg_temp.mark(500000001) ->> 'mark')::numeric,
  72::numeric,
  'A1: the mark is the lowest snapshot of the country'
);
select is(
  pg_temp.mark(500000001, true) -> 'scores',
  '[72, 80, 95]'::jsonb,
  'A1: the full-distribution request lists every holder snapshot, ascending'
);
select is(
  jsonb_typeof(pg_temp.mark(500000001) -> 'scores'),
  'null',
  'A10: without the full distribution the score list is not returned'
);
select is(
  (select array_agg(key order by key) from jsonb_object_keys(pg_temp.mark(500000001)) as key),
  array['mark', 'n', 'scores'],
  'A10: the payload carries only mark, n and the score list'
);
select ok(
  not exists (
    select 1
    from jsonb_array_elements(pg_temp.mark(500000001, true) -> 'scores') as score
    where jsonb_typeof(score) <> 'number'
  ),
  'A10: the score list holds numbers only'
);

-- ---------------------------------------------------------------------------
-- A2: a single holder is enough; no minimum.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.create_survey(510000001, 'BY');
select pg_temp.create_survey(510000002, 'BY');
select pg_temp.seed_report(510000002, 88);

select is(
  (pg_temp.mark(510000001) ->> 'n')::integer,
  1,
  'A2: one counted holder is enough'
);
select is(
  (pg_temp.mark(510000001) ->> 'mark')::numeric,
  88::numeric,
  'A2: the mark is the single holder snapshot'
);
select is(
  pg_temp.mark(510000001, true) -> 'scores',
  '[88]'::jsonb,
  'A2: the single snapshot is the whole score list'
);

-- ---------------------------------------------------------------------------
-- A5: a holder whose survey is is_suspicious is not counted in the mark, n or the dots.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.create_survey(520000001, 'BY');
select pg_temp.create_survey(520000002, 'BY');
select pg_temp.create_survey(520000003, 'BY');
select pg_temp.create_survey(520000004, 'BY');
select pg_temp.seed_report(520000002, 72);
select pg_temp.seed_report(520000003, 80);
select pg_temp.seed_report(520000004, 95);

update public.responses
set is_suspicious = true
where identity_hash = pg_temp.h(520000003) and intake_year = 2026;

select is(
  (pg_temp.mark(520000001) ->> 'mark')::numeric,
  72::numeric,
  'A5: a suspicious holder at 80 does not lower the mark'
);
select is(
  (pg_temp.mark(520000001) ->> 'n')::integer,
  2,
  'A5: a suspicious holder is not counted'
);
select is(
  pg_temp.mark(520000001, true) -> 'scores',
  '[72, 95]'::jsonb,
  'A5: a suspicious holder has no dot in the list'
);

-- ---------------------------------------------------------------------------
-- A6: editing the survey without saving the report leaves the snapshot and the mark alone.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.create_survey(530000001, 'BY', 2026, 4.5, 5);

select public.create_scholarship_report(
  pg_temp.h(530000001), 2026, 'direct_studies', null, 'informatyka', '0613', null, 'science-096'
);

select is(
  (pg_temp.mark(530000001) ->> 'mark')::numeric,
  81::numeric,
  'A6: the mark starts from the saved snapshot'
);
select is(
  pg_temp.update_survey(530000001, 'BY', 13, 18) is not null,
  true,
  'A6: the survey stays editable after its report exists'
);
select is(
  (select nawa_orientation_score from public.responses where identity_hash = pg_temp.h(530000001)),
  65::numeric,
  'A6: the survey now scores 65'
);
select is(
  (pg_temp.mark(530000001) ->> 'mark')::numeric,
  81::numeric,
  'A6: the mark stays at the 81 snapshot'
);
select is(
  (select score_snapshot from public.scholarship_reports where identity_hash = pg_temp.h(530000001)),
  81::numeric,
  'A6: the stored snapshot is unchanged'
);

-- ---------------------------------------------------------------------------
-- A7: deleting a report or a survey removes its share of the mark at once.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.create_survey(540000001, 'BY');
select pg_temp.create_survey(540000002, 'BY');
select pg_temp.seed_report(540000001, 72);
select pg_temp.seed_report(540000002, 88);

select is(
  (pg_temp.mark(540000001) ->> 'mark')::numeric,
  72::numeric,
  'A7: two holders start the mark at 72'
);
select public.delete_scholarship_report(pg_temp.h(540000001), 2026);
select is(
  (pg_temp.mark(540000001) ->> 'mark')::numeric,
  88::numeric,
  'A7: deleting the report at 72 moves the mark to 88'
);
select is(
  (pg_temp.mark(540000001) ->> 'n')::integer,
  1,
  'A7: the deleted report leaves the count'
);
delete from public.responses
where identity_hash = pg_temp.h(540000002) and intake_year = 2026;
select is(
  pg_temp.mark(540000001) -> 'mark',
  'null'::jsonb,
  'A7: deleting the last holder survey leaves no mark'
);
select is(
  (pg_temp.mark(540000001) ->> 'n')::integer,
  0,
  'A7: no holders remain'
);
select is(
  pg_temp.mark(540000001, true) -> 'scores',
  'null'::jsonb,
  'A7: a country without holders has no score list'
);

-- ---------------------------------------------------------------------------
-- A9 SQL: only a 2026 Director survey sees the mark; another intake year gets null.
-- ---------------------------------------------------------------------------
select pg_temp.reset_data();
select pg_temp.create_survey(550000001, 'BY', 2025);

select is(
  public.get_orientation_mark(pg_temp.h(550000001), 2026, false),
  null,
  'A9 SQL: a 2025 survey sees nothing of the 2026 mark'
);
select is(
  public.get_orientation_mark(pg_temp.h(550000001), 2025, true),
  null,
  'A9 SQL: the mark exists only for the 2026 intake'
);
select is(
  public.get_orientation_mark(pg_temp.h(559999999), 2026, false),
  null,
  'A9 SQL: a caller without any survey gets null'
);

select pg_temp.create_survey(550000002, 'BY');

select is(
  pg_temp.mark(550000002),
  '{"mark": null, "n": 0, "scores": null}'::jsonb,
  'A7: a country without a counted holder answers mark null and n 0'
);
select is(
  jsonb_typeof(pg_temp.mark(550000002, true) -> 'scores'),
  'null',
  'A10: the full-distribution request has no list when no holder is counted'
);

select * from finish();
rollback;
