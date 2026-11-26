-- A tiny pgTAP stand-in for PGlite (see run-pglite-tests.mjs): plan, ok, is, lives_ok, throws_ok, finish.
-- CI runs the real pgTAP against PostgreSQL; this file only exists so the same SQL tests run without Docker.

create table extensions.tap_state (n int not null default 0);
insert into extensions.tap_state values (0);

create function extensions.plan(p int) returns text language plpgsql as $$
begin update extensions.tap_state set n = 0; return '1..' || p; end $$;

create function extensions._tap(p_ok boolean, p_desc text, p_diag text default null) returns text language plpgsql as $$
declare v int;
begin
  update extensions.tap_state set n = n + 1 returning n into v;
  return (case when p_ok then 'ok ' else 'not ok ' end) || v || ' - ' || coalesce(p_desc, '')
    || case when not p_ok and p_diag is not null then E'\n# ' || p_diag else '' end;
end $$;

create function extensions.ok(p boolean, d text default null) returns text language sql as
$$ select extensions._tap(coalesce(p, false), d) $$;

create function extensions.is(have anyelement, want anyelement, d text default null) returns text language sql as
$$ select extensions._tap(have is not distinct from want, d, 'have: ' || coalesce(have::text,'NULL') || ' want: ' || coalesce(want::text,'NULL')) $$;

create function extensions.lives_ok(q text, d text default null) returns text language plpgsql as $$
begin execute q; return extensions._tap(true, d);
exception when others then return extensions._tap(false, d, SQLERRM);
end $$;

create function extensions.throws_ok(q text, code text, msg text, d text default null) returns text language plpgsql as $$
begin execute q; return extensions._tap(false, d, 'no exception thrown');
exception when others then
  return extensions._tap(
    (code is null or SQLSTATE = code) and (msg is null or SQLERRM = msg), d,
    'got ' || SQLSTATE || ': ' || SQLERRM);
end $$;

create function extensions.finish() returns setof text language sql as $$ select 'finished'::text where false $$;
