-- Change discount eligibility only; full-duration occupancy/opening-hours checks remain.
-- No schema, privileges, prices, template times or existing bookings are changed.
begin;
do $migration$
declare definition text;
begin
 select pg_get_functiondef('public.consumer_booking_plan(bigint,timestamptz,bigint)'::regprocedure) into definition;
 definition := replace(definition,
   '(p_start at time zone ''Asia/Seoul'')::time+make_interval(mins=>minutes)<=t.end_time',
   '(p_start at time zone ''Asia/Seoul'')::time<t.end_time');
 definition := replace(definition,
   '(p_start at time zone ''Asia/Seoul'')::time+make_interval(mins=>minutes)>t.end_time',
   '(p_start at time zone ''Asia/Seoul'')::time>=t.end_time');
 if position('(p_start at time zone ''Asia/Seoul'')::time<t.end_time' in definition)=0
    or position('(p_start at time zone ''Asia/Seoul'')::time>=t.end_time' in definition)=0 then
   raise exception 'Unexpected booking function; no changes applied';
 end if;
 execute definition;
end $migration$;
commit;
select position('::time<t.end_time' in pg_get_functiondef('public.consumer_booking_plan(bigint,timestamptz,bigint)'::regprocedure))>0 as start_window_enabled,
 position('p_start+make_interval(mins=>minutes)' in pg_get_functiondef('public.consumer_booking_plan(bigint,timestamptz,bigint)'::regprocedure))>0 as full_occupancy_preserved;
