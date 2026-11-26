begin;

create extension if not exists pgtap with schema extensions;

create function pg_temp.h(bigint) returns text language sql immutable as $$ select lpad(to_hex($1), 64, '0') $$;

truncate table public.responses, public.product_events, public.score_change_log restart identity cascade;

select plan(22);

-- Capture the SQLSTATE, message and detail of a call without aborting the whole test transaction.
create function pg_temp.error_of(q text)
returns table (state text, error_message text, error_detail text)
language plpgsql as $$
declare
  v_state text;
  v_message text;
  v_detail text;
begin
  begin
    execute q;
  exception when others then
    get stacked diagnostics
      v_state = returned_sqlstate,
      v_message = message_text,
      v_detail = pg_exception_detail;
    return query select v_state, v_message, v_detail;
    return;
  end;
  return query select '00000'::text, null::text, null::text;
end;
$$;

create function pg_temp.create_survey(p_id bigint, p_average numeric)
returns jsonb language sql as $$
  select public.create_response_for_identity(
    pg_temp.h(p_id), 2026,
    false, 'UA', 'UA',
    'nawa_director', 'direct_studies', 'science-096',
    '0613', null,
    'final_certificate', 'school_leaver',
    p_average, 5, 'secondary',
    'submitted', current_date
  );
$$;

create function pg_temp.update_survey(p_id bigint, p_average numeric, p_grade_basis text default 'final_certificate')
returns jsonb language sql as $$
  select public.update_current_response(
    pg_temp.h(p_id), 2026,
    false, 'UA', 'UA',
    'nawa_director', 'direct_studies', 'science-096',
    '0613', null,
    p_grade_basis, 'school_leaver',
    p_average, 5, 'secondary',
    'submitted', current_date
  );
$$;

create function pg_temp.backdate_last_counted(p_id bigint, p_age interval)
returns void language sql as $$
  update public.score_change_log
  set saved_at = now() - p_age
  where ctid = (
    select ctid
    from public.score_change_log
    where identity_hash = pg_temp.h(p_id)
      and counted
    order by saved_at desc
    limit 1
  );
$$;

create function pg_temp.backdate_oldest_counted(p_id bigint, p_age interval)
returns void language sql as $$
  update public.score_change_log
  set saved_at = now() - p_age
  where ctid = (
    select ctid
    from public.score_change_log
    where identity_hash = pg_temp.h(p_id)
      and counted
    order by saved_at asc
    limit 1
  );
$$;

-- A1: the first create is saved and recorded uncounted.
select ok(
  (pg_temp.create_survey(900000001, 4.5)->>'created')::boolean,
  'A1: a new account can create its first survey'
);
select is(
  (select jsonb_agg(jsonb_build_object('counted', counted))
   from public.score_change_log
   where identity_hash = pg_temp.h(900000001)),
  '[{"counted": false}]'::jsonb,
  'A1: the first create leaves one uncounted trail row'
);

-- A2: three score-changing edits pass, the fourth is blocked with the oldest retry time.
select pg_temp.create_survey(900000002, 4.5);
select lives_ok('select pg_temp.update_survey(900000002, 4.6)', 'A2: the first score-changing edit succeeds');
select pg_temp.backdate_last_counted(900000002, interval '3 hours');
select lives_ok('select pg_temp.update_survey(900000002, 4.7)', 'A2: the second score-changing edit succeeds');
select pg_temp.backdate_last_counted(900000002, interval '2 hours');
select lives_ok('select pg_temp.update_survey(900000002, 4.8)', 'A2: the third score-changing edit succeeds');
select pg_temp.backdate_last_counted(900000002, interval '1 hour');

select is(
  (select error_message from pg_temp.error_of('select pg_temp.update_survey(900000002, 4.9)')),
  'edit_limit_reached',
  'A2: the fourth score-changing edit in the window is blocked'
);
select is(
  (select error_detail from pg_temp.error_of('select pg_temp.update_survey(900000002, 4.9)')),
  (select to_char((min(saved_at) + interval '24 hours') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
   from public.score_change_log
   where identity_hash = pg_temp.h(900000002)
     and counted
     and saved_at > now() - interval '24 hours'),
  'A2: the retry time is the oldest counted row plus 24 hours'
);
select is(
  (select average_grade from public.responses where identity_hash = pg_temp.h(900000002)),
  4.8::numeric,
  'A2: the blocked edit keeps the third edit values'
);

-- A3: score-neutral edits never count, including after the limit is reached.
select pg_temp.create_survey(900000003, 4.5);
select lives_ok(
  $$select pg_temp.update_survey(900000003, 4.5, 'half_year'),
           pg_temp.update_survey(900000003, 4.5, 'final_certificate'),
           pg_temp.update_survey(900000003, 4.5, 'half_year')$$,
  'A3: any number of edits that leave the score unchanged succeed'
);
select is(
  (select jsonb_agg(jsonb_build_object('counted', counted))
   from public.score_change_log
   where identity_hash = pg_temp.h(900000003)),
  '[{"counted": false}]'::jsonb,
  'A3: unchanged-score edits add no trail rows'
);
select lives_ok(
  $$select pg_temp.update_survey(900000002, 4.8, 'half_year')$$,
  'A3: an unchanged-score edit still succeeds after the limit is reached'
);
select is(
  (select count(*)::integer from public.score_change_log where identity_hash = pg_temp.h(900000002)),
  4,
  'A3: an unchanged-score edit adds no trail row after the limit'
);

-- A4: a counted row that left the rolling window no longer blocks.
select pg_temp.create_survey(900000004, 4.5);
select pg_temp.update_survey(900000004, 4.6);
select pg_temp.update_survey(900000004, 4.7);
select pg_temp.update_survey(900000004, 4.8);
select pg_temp.backdate_oldest_counted(900000004, interval '25 hours');

select lives_ok(
  'select pg_temp.update_survey(900000004, 4.9)',
  'A4: a fourth edit succeeds when the oldest counted row is older than 24 hours'
);
select is(
  (select average_grade from public.responses where identity_hash = pg_temp.h(900000004)),
  4.9::numeric,
  'A4: the edit that fits the window is applied'
);

-- A5: deletion does not reset the limit and does not erase the trail.
select pg_temp.create_survey(900000005, 4.5);
select pg_temp.update_survey(900000005, 4.6);
select pg_temp.update_survey(900000005, 4.7);
select pg_temp.update_survey(900000005, 4.8);
delete from public.responses where identity_hash = pg_temp.h(900000005);

select is(
  (select count(*)::integer from public.score_change_log where identity_hash = pg_temp.h(900000005)),
  4,
  'A5: deleting the survey keeps the trail rows'
);
select is(
  (select error_message from pg_temp.error_of('select pg_temp.create_survey(900000005, 4.9)')),
  'edit_limit_reached',
  'A5: creating the survey again inside the window is blocked'
);
select is(
  (select count(*)::integer from public.score_change_log where identity_hash = pg_temp.h(900000005)),
  4,
  'A5: the blocked create writes no trail row'
);

-- A6: a create after a recent row counts, so three delete/create cycles fill the limit.
select pg_temp.create_survey(900000006, 4.5);
delete from public.responses where identity_hash = pg_temp.h(900000006);
select pg_temp.create_survey(900000006, 4.6);
select is(
  (select count(*)::integer
   from public.score_change_log
   where identity_hash = pg_temp.h(900000006) and counted),
  1,
  'A6: a survey created again inside the window records a counted row'
);
delete from public.responses where identity_hash = pg_temp.h(900000006);
select pg_temp.create_survey(900000006, 4.7);
delete from public.responses where identity_hash = pg_temp.h(900000006);
select pg_temp.create_survey(900000006, 4.8);
delete from public.responses where identity_hash = pg_temp.h(900000006);
select is(
  (select error_message from pg_temp.error_of('select pg_temp.create_survey(900000006, 4.9)')),
  'edit_limit_reached',
  'A6: the next create is blocked after three counted re-creates'
);

-- A8: the purge removes expired rows and keeps recent ones.
insert into public.score_change_log (identity_hash, saved_at, counted) values
  (pg_temp.h(900000007), now() - interval '25 hours', true),
  (pg_temp.h(900000007), now() - interval '1 hour', true);

select ok(public.purge_score_change_log() >= 1, 'A8: the purge deletes expired rows');
select is(
  (select count(*)::integer
   from public.score_change_log
   where identity_hash = pg_temp.h(900000007)
     and saved_at <= now() - interval '24 hours'),
  0,
  'A8: rows older than 24 hours are gone after the purge'
);
select is(
  (select count(*)::integer from public.score_change_log where identity_hash = pg_temp.h(900000007)),
  1,
  'A8: rows newer than 24 hours stay after the purge'
);

select * from finish();
rollback;
