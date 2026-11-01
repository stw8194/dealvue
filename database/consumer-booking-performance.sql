-- Read-only query optimizations; preserves existing RPC signatures and grants.
begin;
create or replace function public.consumer_booking_availability(p_offer_id bigint,p_date date,p_staff_id bigint default null,p_exclude_id bigint default null)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare start_time timestamptz; plan jsonb; leg jsonb; result jsonb:='[]'; ok boolean; chosen bigint; price bigint; kind text; original bigint;
 first_business bigint; first_minutes integer; hours text[]; opens integer; closes integer; midnight timestamptz;
begin
 if auth.uid() is null then raise exception '로그인 후 예약해 주세요.'; end if;
 if p_date is null or p_date<(now() at time zone 'Asia/Seoul')::date or p_date>=(now() at time zone 'Asia/Seoul')::date+14 then raise exception '2주 이내 날짜를 선택해 주세요.'; end if;
 -- Only generate starts that can fit the first shop's actual opening hours.
 -- The existing plan still validates every leg, holiday, price and deal window.
 if p_offer_id>=2000000 then
  select min(s.business_id),sum(s.duration_minutes)::int into first_business,first_minutes
  from consumer_booking_kits k join services s on s.source_key in (select jsonb_array_elements_text(k.visits->0->'services'))
  where k.id=p_offer_id-2000000 and k.active;
 else
  select business_id,duration_minutes into first_business,first_minutes from services where id=p_offer_id-1000000;
 end if;
 if first_business is null or first_minutes is null or first_minutes<=0 then return result; end if;
 select regexp_match(coalesce(source_details->>'opening_hours','10:00~20:00'),'(\d{1,2}):(\d{2})\s*[~–-]\s*(\d{1,2}):(\d{2})') into hours from businesses where id=first_business;
 opens:=coalesce(hours[1]::int*60+hours[2]::int,600); closes:=coalesce(hours[3]::int*60+hours[4]::int,1200);
 opens:=((opens+29)/30)*30;
 if opens+first_minutes>closes then return result; end if;
 midnight:=p_date::timestamp at time zone 'Asia/Seoul';
 if not consumer_visit_fits(first_business,midnight+make_interval(mins=>opens),first_minutes) then return result; end if;
 for start_time in select generate_series(midnight+make_interval(mins=>opens),midnight+make_interval(mins=>closes-first_minutes),interval '30 minutes') loop
  begin plan:=consumer_booking_plan(p_offer_id,start_time,p_exclude_id); exception when raise_exception then continue; end;
  ok:=true;
  for leg in select value from jsonb_array_elements(plan->'legs') loop
   if exists(select 1 from reservations r where user_id=auth.uid() and id is distinct from p_exclude_id and status<>'cancelled' and r.start_at<(leg->>'endAt')::timestamptz and (leg->>'startAt')::timestamptz<r.end_at) then ok:=false;exit;end if;
   select id into chosen from staff where business_id=(leg->>'businessId')::bigint and (p_staff_id is null or id=p_staff_id) and consumer_staff_free(business_id,id,(leg->>'startAt')::timestamptz,(leg->>'endAt')::timestamptz,p_exclude_id) order by id limit 1;
   if chosen is null then ok:=false;exit;end if;
  end loop;
  result:=result||jsonb_build_array(jsonb_build_object('start_at',start_time,'end_at',plan->'legs'->-1->>'endAt','available',ok,'kind',plan->>'kind','price',(plan->>'price')::bigint));
 end loop;
 return result;
end $$;

create or replace function public.consumer_deal_stock()
returns table(service_id bigint,remaining_capacity integer) language sql stable security definer set search_path=public,pg_temp as $$
 with rounds as materialized (
  select b.business_id,consumer_sale_round(b.business_id) rotation_key
  from (select distinct business_id from provided_deal_templates) b
 )
 select t.service_id,greatest(0,t.remaining_capacity-(select count(*)::int from reservations r where r.status<>'cancelled' and r.consumer_booking->>'offerId'=(1000000+t.service_id)::text and r.consumer_booking->>'rotationKey'=rounds.rotation_key))
 from provided_deal_templates t join rounds on rounds.business_id=t.business_id;
$$;
commit;
