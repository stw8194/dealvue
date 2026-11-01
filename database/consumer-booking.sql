-- Shared consumer bookings: run as the database owner. Additive, no reservation deletion.
begin;
alter table public.reservations add column if not exists consumer_booking jsonb;
create table if not exists public.consumer_booking_requests (
 user_id uuid not null, request_id uuid not null, signature jsonb not null,
 reservation_ids bigint[] not null, primary key(user_id,request_id)
);
create table if not exists public.consumer_booking_kits (
 id bigint primary key,title text not null,price bigint not null check(price>0),
 original_price bigint not null,visits jsonb not null,active boolean not null default true
);
alter table public.consumer_booking_requests enable row level security;
alter table public.consumer_booking_kits enable row level security;
revoke all on public.consumer_booking_requests,public.consumer_booking_kits from public,anon,authenticated;
-- Browser clients can read only their own reservations; all writes go through checked RPCs.
alter table public.reservations enable row level security;
revoke all on public.reservations from anon;
revoke insert,update,delete on public.reservations from authenticated;
grant select on public.reservations to authenticated;
drop policy if exists consumer_reservations_read on public.reservations;
create policy consumer_reservations_read on public.reservations for select to authenticated using(user_id=auth.uid());

create or replace function public.consumer_sale_round(p_business bigint)
returns text language plpgsql stable security definer set search_path=public,pg_temp as $$
declare elapsed numeric; cycle bigint; step integer; rem numeric; round_id bigint; team integer; teams integer;
begin
 elapsed:=extract(epoch from (now()-'2026-10-15T00:00:00+09'::timestamptz))/3600;
 cycle:=floor(elapsed/10); rem:=elapsed-cycle*10;
 step:=case when rem<1 then 0 when rem<3 then 1 when rem<6 then 2 else 3 end;
 round_id:=cycle*4+step;
 with shops as (select distinct t.business_id,coalesce(c.category::text,'other') category from provided_deal_templates t left join business_category c on c.business_id=t.business_id where t.remaining_capacity>0),
 ranked as (select *,row_number() over(partition by category order by business_id) r from shops),
 ordered as (select business_id,row_number() over(order by r,category)-1 pos,count(*) over() n from ranked)
 select (pos/5)::int,ceil(n/5.0)::int into team,teams from ordered where business_id=p_business;
 if team is null or mod(mod(round_id,teams)+teams,teams)<>team then return null; end if;
 return round_id::text||':'||p_business;
end $$;

create or replace function public.consumer_visit_fits(p_business bigint,p_start timestamptz,p_minutes integer,p_staff bigint default null)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare details jsonb; hours text[]; closed_days text; local_start timestamp; opens integer; closes integer; minute integer; sh staff_booking_hours;
begin
 select source_details into details from businesses where id=p_business;
 if not found or p_minutes<=0 then return false; end if;
 local_start:=p_start at time zone 'Asia/Seoul';
 if local_start::date<>((p_start+make_interval(mins=>p_minutes)-interval '1 microsecond') at time zone 'Asia/Seoul')::date then return false; end if;
 closed_days:=coalesce(details->>'closed_days','');
 if position('매주' in closed_days)>0 and position(substr('일월화수목금토',extract(dow from local_start)::int+1,1)||'요일' in closed_days)>0 then return false; end if;
 if position('둘째' in closed_days)>0 and position('넷째' in closed_days)>0 and position(substr('일월화수목금토',extract(dow from local_start)::int+1,1)||'요일' in closed_days)>0 and ceil(extract(day from local_start)/7) in (2,4) then return false; end if;
 hours:=regexp_match(coalesce(details->>'opening_hours','10:00~20:00'),'(\d{1,2}):(\d{2})\s*[~–-]\s*(\d{1,2}):(\d{2})');
 opens:=coalesce(hours[1]::int*60+hours[2]::int,600); closes:=coalesce(hours[3]::int*60+hours[4]::int,1200);
 minute:=extract(hour from local_start)::int*60+extract(minute from local_start)::int;
 if minute<opens or minute+p_minutes>closes or extract(second from local_start)<>0 or mod(minute,30)<>0 then return false; end if;
 if p_staff is not null then
  if not exists(select 1 from staff where id=p_staff and business_id=p_business) then return false; end if;
  select * into sh from staff_booking_hours where staff_id=p_staff and weekday=extract(dow from local_start);
  if found and (sh.closed or minute<sh.starts_minute or minute+p_minutes>sh.ends_minute) then return false; end if;
 end if;
 return true;
end $$;

-- Prices, service IDs, durations and package legs are read from trusted server data.
create or replace function public.consumer_booking_plan(p_offer bigint,p_start timestamptz,p_existing bigint default null)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare t provided_deal_templates; s services; k consumer_booking_kits; old reservations; visit jsonb; leg jsonb; legs jsonb:='[]';
 ids bigint[]; bid bigint; minutes integer; menu bigint; total bigint:=0; original bigint; price bigint; kind text; rotation text; title text; summary text; cursor_at timestamptz; previous_bid bigint; keep boolean:=false; n integer:=0;
begin
 if auth.uid() is null then raise exception '로그인 후 예약해 주세요.'; end if;
 if p_start is null or p_start<=now() or (p_start at time zone 'Asia/Seoul')::date >= (now() at time zone 'Asia/Seoul')::date+14 then raise exception '오늘부터 2주 이내의 방문 일정을 선택해 주세요.'; end if;
 if p_existing is not null then
  select * into old from reservations where id=p_existing and user_id=auth.uid();
  if not found or old.consumer_booking is null or old.consumer_booking->>'offerId'<>p_offer::text or old.status not in ('waiting','confirmed') or old.start_at<=now() then raise exception '변경할 수 없는 예약입니다.'; end if;
  if old.consumer_booking->>'kind'='package' then raise exception '패키지는 취소 후 다시 예약해 주세요.'; end if;
  keep:=true;
 end if;
 if p_offer>=2000000 then
  select * into k from consumer_booking_kits where id=p_offer-2000000 and active;
  if not found then raise exception '예약 가능한 패키지를 찾을 수 없습니다.'; end if;
  kind:='package';price:=k.price;original:=k.original_price;title:=k.title;cursor_at:=p_start;
  for visit in select value from jsonb_array_elements(k.visits) loop
   select array_agg(id order by id),min(business_id) into ids,bid from services where source_key in (select jsonb_array_elements_text(visit->'services'));
   if coalesce(cardinality(ids),0)<>jsonb_array_length(visit->'services') or exists(select 1 from services where id=any(ids) and business_id<>bid) then raise exception '패키지 시술 연결을 확인해 주세요.'; end if;
   if previous_bid is not null and previous_bid<>bid then cursor_at:=cursor_at+interval '30 minutes'; end if;
   select sum(duration_minutes),sum(services.price),string_agg(name,' + ' order by id) into minutes,menu,summary from services where id=any(ids);
   if not consumer_visit_fits(bid,cursor_at,minutes) then raise exception '모든 매장의 영업시간 안에 끝나는 일정을 선택해 주세요.'; end if;
   legs:=legs||jsonb_build_array(jsonb_build_object('businessId',bid,'serviceIds',ids,'startAt',cursor_at,'endAt',cursor_at+make_interval(mins=>minutes),'minutes',minutes,'menuPrice',menu,'summary',title||' · '||summary));
   cursor_at:=cursor_at+make_interval(mins=>minutes);previous_bid:=bid;total:=total+menu;n:=n+1;
  end loop;
  if n=0 or total<=0 then raise exception '패키지 구성이 올바르지 않습니다.'; end if;
 else
  select * into s from services where id=p_offer-1000000;
  if not found or s.duration_minutes is null or s.duration_minutes<=0 then raise exception '시술 정보를 확인해 주세요.'; end if;
  select * into t from provided_deal_templates where service_id=s.id order by source_key limit 1;
  if not found then raise exception '예약 가능한 시술이 아닙니다.'; end if;
  bid:=s.business_id; minutes:=s.duration_minutes;
  if not consumer_visit_fits(bid,p_start,minutes) then raise exception '시술이 영업시간 안에 끝나는 일정을 선택해 주세요.'; end if;
  rotation:=consumer_sale_round(bid);
  kind:=case when rotation is not null and t.remaining_capacity>0 and (p_start at time zone 'Asia/Seoul')::time>=t.start_time and (p_start at time zone 'Asia/Seoul')::time<t.end_time then 'timedeal' else 'regular' end;
  if keep then
   kind:=old.consumer_booking->>'kind'; rotation:=old.consumer_booking->>'rotationKey';
   if kind='timedeal' and ((p_start at time zone 'Asia/Seoul')::time<t.start_time or (p_start at time zone 'Asia/Seoul')::time>=t.end_time) then raise exception '타임딜 방문 시간 안의 일정으로 변경해 주세요.'; end if;
  elsif kind='timedeal' and (select count(*) from reservations r where r.status<>'cancelled' and r.consumer_booking->>'offerId'=p_offer::text and r.consumer_booking->>'rotationKey'=rotation)>=t.remaining_capacity then
   kind:='regular';
  end if;
  price:=case when keep then old.price when kind='timedeal' then t.deal_price else s.price end;
  original:=case when keep then (old.consumer_booking->>'originalPrice')::bigint when kind='timedeal' then t.original_price else s.price end;
  legs:=jsonb_build_array(jsonb_build_object('businessId',bid,'serviceIds',array[s.id],'startAt',p_start,'endAt',p_start+make_interval(mins=>minutes),'minutes',minutes,'menuPrice',s.price,'summary',s.name));total:=s.price;
 end if;
 return jsonb_build_object('offerId',p_offer,'kind',kind,'price',price,'originalPrice',original,'rotationKey',case when kind='timedeal' then rotation else null end,'legs',legs,'menuTotal',total);
end $$;

create or replace function public.consumer_staff_free(p_business bigint,p_staff bigint,p_start timestamptz,p_end timestamptz,p_exclude bigint default null)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select consumer_visit_fits(p_business,p_start,(extract(epoch from p_end-p_start)/60)::int,p_staff)
 and not exists(select 1 from reservations r where r.business_id=p_business and (r.staff_id=p_staff or r.staff_id is null) and r.id is distinct from p_exclude and r.status<>'cancelled' and r.start_at<p_end and p_start<r.end_at)
 and not exists(select 1 from booking_time_off o where o.business_id=p_business and (o.staff_id is null or o.staff_id=p_staff) and o.start_at<p_end and p_start<o.end_at);
$$;

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

create or replace function public.consumer_create_booking(p_offer_id bigint,p_start_at timestamptz,p_staff_id bigint,p_kind text,p_price bigint,p_request_id uuid)
returns bigint language plpgsql security definer set search_path=public,pg_temp as $$
declare plan jsonb; leg jsonb; signature jsonb; previous consumer_booking_requests; ids bigint[]:='{}'; rid bigint; chosen bigint; bid bigint; share bigint; original_share bigint; allocated bigint:=0; original_allocated bigint:=0; idx int:=0; n int; group_id uuid;
begin
 if auth.uid() is null then raise exception '로그인 후 예약해 주세요.'; end if;
 if p_request_id is null then raise exception '예약 요청을 다시 시작해 주세요.'; end if;
 perform pg_advisory_xact_lock(20261028,1);
 signature:=jsonb_build_object('offer',p_offer_id,'start',p_start_at,'staff',p_staff_id,'kind',p_kind,'price',p_price);
 select * into previous from consumer_booking_requests where user_id=auth.uid() and request_id=p_request_id;
 if found then if previous.signature<>signature then raise exception '이미 사용한 요청입니다. 예약 화면을 다시 열어 주세요.';end if;return previous.reservation_ids[1];end if;
 plan:=consumer_booking_plan(p_offer_id,p_start_at);
 if plan->>'kind' is distinct from p_kind or (plan->>'price')::bigint is distinct from p_price then raise exception '예약 금액이 바뀌었어요. 화면을 새로 확인하고 동의해 주세요.';end if;
 insert into public.users(id,name) values(auth.uid(),'딜뷰 이웃') on conflict(id) do nothing;
 n:=jsonb_array_length(plan->'legs');if p_kind='package' then group_id:=gen_random_uuid();end if;
 for leg in select value from jsonb_array_elements(plan->'legs') loop
  bid:=(leg->>'businessId')::bigint;
  if exists(select 1 from reservations r where user_id=auth.uid() and status<>'cancelled' and r.start_at<(leg->>'endAt')::timestamptz and (leg->>'startAt')::timestamptz<r.end_at) then raise exception '같은 시간에 다른 예약이 있어요.';end if;
  select id into chosen from staff where business_id=bid and (p_staff_id is null or id=p_staff_id) and consumer_staff_free(bid,id,(leg->>'startAt')::timestamptz,(leg->>'endAt')::timestamptz) order by id limit 1;
  if chosen is null then raise exception '다른 예약이 먼저 접수됐어요. 담당자나 시간을 다시 선택해 주세요.';end if;
  share:=case when idx=n-1 then p_price-allocated else floor(p_price*(leg->>'menuPrice')::numeric/(plan->>'menuTotal')::numeric)::bigint end;
  original_share:=case when idx=n-1 then (plan->>'originalPrice')::bigint-original_allocated else floor((plan->>'originalPrice')::numeric*(leg->>'menuPrice')::numeric/(plan->>'menuTotal')::numeric)::bigint end;
  insert into reservations(user_id,business_id,staff_id,service_id,status,start_at,end_at,price,booking_channel,booking_service_ids,booking_summary,consumer_booking)
  values(auth.uid(),bid,chosen,(leg->'serviceIds'->>0)::bigint,'confirmed',(leg->>'startAt')::timestamptz,(leg->>'endAt')::timestamptz,share,'app',array(select jsonb_array_elements_text(leg->'serviceIds')::bigint),leg->>'summary',jsonb_build_object('offerId',p_offer_id,'kind',p_kind,'originalPrice',original_share,'rotationKey',plan->>'rotationKey','groupId',group_id,'legIndex',idx,'legCount',n,'requestKey',p_request_id,'policy','예약 시 결제하지 않습니다. 방문 시작 전까지 변경·취소할 수 있습니다.')) returning id into rid;
  ids:=array_append(ids,rid);allocated:=allocated+share;original_allocated:=original_allocated+original_share;idx:=idx+1;
 end loop;
 insert into consumer_booking_requests values(auth.uid(),p_request_id,signature,ids);
 return ids[1];
exception when exclusion_violation then raise exception '다른 예약이 먼저 접수됐어요. 시간을 다시 선택해 주세요.';
end $$;

create or replace function public.consumer_change_booking(p_id bigint,p_start_at timestamptz,p_expected_start timestamptz)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r reservations; plan jsonb; leg jsonb;
begin
 if auth.uid() is null then raise exception '로그인 후 예약해 주세요.';end if;
 perform pg_advisory_xact_lock(20261028,1);
 select * into r from reservations where id=p_id and user_id=auth.uid() for update;
 if not found then raise exception '예약을 찾을 수 없습니다.';end if;
 if r.start_at=p_start_at and r.status in ('waiting','confirmed') then return;end if;
 if r.start_at is distinct from p_expected_start then raise exception '다른 화면에서 일정이 바뀌었어요. 다시 확인해 주세요.';end if;
 plan:=consumer_booking_plan((r.consumer_booking->>'offerId')::bigint,p_start_at,p_id);leg:=plan->'legs'->0;
 if not consumer_staff_free(r.business_id,r.staff_id,p_start_at,(leg->>'endAt')::timestamptz,p_id) then raise exception '이미 예약된 시간입니다. 다른 시간을 선택해 주세요.';end if;
 if exists(select 1 from reservations where user_id=auth.uid() and id<>p_id and status<>'cancelled' and start_at<(leg->>'endAt')::timestamptz and p_start_at<end_at) then raise exception '같은 시간에 다른 예약이 있어요.';end if;
 update reservations set start_at=p_start_at,end_at=(leg->>'endAt')::timestamptz,updated_at=now() where id=p_id;
end $$;

create or replace function public.consumer_cancel_booking(p_id bigint,p_reason text default '')
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r reservations;begin
 if auth.uid() is null then raise exception '로그인 후 예약해 주세요.';end if;
 perform pg_advisory_xact_lock(20261028,1);
 select * into r from reservations where id=p_id and user_id=auth.uid() for update;
 if not found then raise exception '예약을 찾을 수 없습니다.';end if;
 if r.status='cancelled' then return;end if;
 if r.status not in ('waiting','confirmed') or r.start_at<=now() then raise exception '방문 시작 전 예약만 취소할 수 있습니다.';end if;
 if r.consumer_booking->>'groupId' is not null and exists(select 1 from reservations where user_id=auth.uid() and consumer_booking->>'groupId'=r.consumer_booking->>'groupId' and status<>'cancelled' and start_at<=now()) then raise exception '방문이 시작된 패키지는 취소할 수 없습니다.';end if;
 update reservations set status='cancelled',updated_at=now(),consumer_booking=case when consumer_booking is null then null else consumer_booking||jsonb_build_object('cancellationReason',left(coalesce(p_reason,''),200)) end
 where user_id=auth.uid() and (id=p_id or (r.consumer_booking->>'groupId' is not null and consumer_booking->>'groupId'=r.consumer_booking->>'groupId'));
end $$;

CREATE OR REPLACE FUNCTION public.guard_salon_reservation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare totals record; mode text; allowed boolean; ending timestamptz; begin

  -- Shared lock also serializes legacy RPCs with consumer/package mutations.
  perform pg_advisory_xact_lock(20261028,1);
  if new.consumer_booking is not null then
    if tg_op='UPDATE' then
      if old.status='cancelled' and new.status<>'cancelled' then raise exception '취소된 예약은 다시 접수해 주세요.';end if;
      new.price:=old.price;
      if new.status='cancelled' then return new;end if;
    end if;
    if not exists(select 1 from staff where id=new.staff_id and business_id=new.business_id) then raise exception '담당자를 확인해 주세요.';end if;
    if (select count(*) from services where id=any(new.booking_service_ids) and business_id=new.business_id)<>cardinality(new.booking_service_ids)
      or (select sum(duration_minutes) from services where id=any(new.booking_service_ids))<>extract(epoch from new.end_at-new.start_at)/60 then raise exception '시술 점유 시간이 올바르지 않습니다.';end if;
    if not consumer_visit_fits(new.business_id,new.start_at,(extract(epoch from new.end_at-new.start_at)/60)::int,new.staff_id) then raise exception '담당자의 근무시간을 확인해 주세요.';end if;
    return new;
  end if;
  if tg_op='UPDATE' then
    if old.status='cancelled' and new.status<>'cancelled' then
      raise exception '취소된 예약은 새 예약으로 다시 접수해 주세요.';
    end if;
    if new.booking_service_ids is distinct from old.booking_service_ids or new.business_id is distinct from old.business_id
      or new.staff_id is distinct from old.staff_id or new.start_at is distinct from old.start_at
      or new.end_at is distinct from old.end_at or new.booking_channel is distinct from old.booking_channel then
      raise exception '예약 내용을 변경하려면 기존 예약을 취소하고 새로 등록해 주세요.';
    end if;
    -- State changes retain the original receipt even if menus/prices change.
    if old.status<>'cancelled' or new.status='cancelled' then
      new.price:=old.price; new.booking_items:=old.booking_items; new.booking_summary:=old.booking_summary;
      return new;
    end if;
  end if;
  if new.booking_service_ids is null then
    if new.booking_channel is not null then raise exception '시술을 먼저 선택해 주세요.'; end if;
    return new;
  end if;
  if new.booking_channel is null or new.booking_channel not in ('app','phone') then raise exception '예약 방식을 확인해 주세요.'; end if;
  perform 1 from public.businesses where id=new.business_id for update;
  select booking_mode into mode from public.business_booking_settings where business_id=new.business_id;
  if mode is null or (mode<>'both' and mode<>new.booking_channel) then raise exception '이 매장에서 지원하지 않는 예약 방식입니다.'; end if;
  select * into totals from public.booking_service_totals(new.business_id,new.booking_service_ids);
  -- Unchanged reservations can be cancelled without changing their price/history.
  if tg_op='UPDATE' and new.status='cancelled' and new.start_at=old.start_at
    and new.staff_id=old.staff_id and new.business_id=old.business_id and new.booking_service_ids=old.booking_service_ids then return new; end if;
  select slot.available,slot.end_at into allowed,ending from public.salon_booking_slots(
    new.business_id,new.staff_id,new.booking_service_ids,(new.start_at at time zone 'Asia/Seoul')::date) slot where slot.start_at=new.start_at;
  if not coalesce(allowed,false) then raise exception '선택한 시간은 예약할 수 없습니다. 시간을 다시 선택해 주세요.'; end if;
  new.end_at:=ending; new.price:=totals.total_price; new.service_id:=new.booking_service_ids[1];
  new.booking_summary:=totals.summary; new.booking_items:=totals.items;
  return new;
end $function$;


insert into public.consumer_booking_kits(id,title,price,original_price,visits) select id,title,price,original_price,visits from jsonb_to_recordset($kits$[{"id": 101, "title": "하객·혼주 웨딩 메이크업 패키지", "visits": [{"shop": "provided:nouvelic", "services": ["provided:nouvelic:service:1", "provided:nouvelic:service:2"]}], "original_price": 230000, "price": 161000}, {"id": 102, "title": "웨딩 촬영 퍼스널 메이크업 패키지", "visits": [{"shop": "provided:riobella", "services": ["provided:riobella:service:1", "provided:riobella:service:4"]}], "original_price": 200000, "price": 150000}, {"id": 103, "title": "프로필·증명사진 메이크업 패키지", "visits": [{"shop": "provided:bellunique", "services": ["provided:bellunique:service:5", "provided:bellunique:service:1"]}], "original_price": 120000, "price": 84000}, {"id": 104, "title": "여행 스냅 촬영 메이크업 패키지", "visits": [{"shop": "provided:arvien", "services": ["provided:arvien:service:4", "provided:arvien:service:1"]}], "original_price": 155000, "price": 116000}, {"id": 105, "title": "수험생 헤어 변신 패키지", "visits": [{"shop": "provided:rivelloa", "services": ["provided:rivelloa:service:1", "provided:rivelloa:service:3", "provided:rivelloa:service:5"]}], "original_price": 185000, "price": 120000}, {"id": 106, "title": "새내기 데일리 메이크업 패키지", "visits": [{"shop": "provided:arvien", "services": ["provided:arvien:service:1", "provided:arvien:service:2"]}], "original_price": 145000, "price": 99000}, {"id": 111, "title": "컬러 체인지 풀케어", "visits": [{"shop": "provided:roere", "services": ["provided:roere:service:1", "provided:roere:service:4", "provided:roere:service:3"]}], "original_price": 290000, "price": 203000}, {"id": 112, "title": "페이셜 & 바디 릴랙스", "visits": [{"shop": "provided:ongyeol", "services": ["provided:ongyeol:service:1", "provided:ongyeol:service:4"]}], "original_price": 210000, "price": 147000}, {"id": 113, "title": "두피 집중 케어 3단계", "visits": [{"shop": "provided:nuagen", "services": ["provided:nuagen:service:1", "provided:nuagen:service:2", "provided:nuagen:service:5"]}], "original_price": 220000, "price": 154000}, {"id": 114, "title": "매직 & 손상모 클리닉", "visits": [{"shop": "provided:moneve", "services": ["provided:moneve:service:1", "provided:moneve:service:5"]}], "original_price": 290000, "price": 203000}, {"id": 121, "title": "면접 완성 헤어·메이크업", "visits": [{"shop": "provided:moneve", "services": ["provided:moneve:service:2"]}, {"shop": "provided:moaren", "services": ["provided:moaren:service:1"]}], "original_price": 120000, "price": 90000}, {"id": 122, "title": "데이트 스타일 체인지", "visits": [{"shop": "provided:ardien", "services": ["provided:ardien:service:3"]}, {"shop": "provided:riobella", "services": ["provided:riobella:service:5"]}], "original_price": 135000, "price": 101000}, {"id": 123, "title": "촬영 전 페이스라인 케어", "visits": [{"shop": "provided:gyeolchae", "services": ["provided:gyeolchae:service:2"]}, {"shop": "provided:bellunique", "services": ["provided:bellunique:service:5"]}], "original_price": 180000, "price": 126000}, {"id": 124, "title": "힐링 데이 바디 & 두피", "visits": [{"shop": "provided:damon", "services": ["provided:damon:service:3"]}, {"shop": "provided:nuagen", "services": ["provided:nuagen:service:2"]}], "original_price": 190000, "price": 133000}]$kits$::jsonb) as x(id bigint,title text,price bigint,original_price bigint,visits jsonb) on conflict(id) do update set title=excluded.title,price=excluded.price,original_price=excluded.original_price,visits=excluded.visits;

-- Restrictive policy prevents any legacy permissive SELECT policy leaking other accounts.
drop policy if exists consumer_reservations_owner_guard on public.reservations;
create policy consumer_reservations_owner_guard on public.reservations as restrictive for select to authenticated using(user_id=auth.uid());
revoke all on function public.consumer_sale_round(bigint),public.consumer_visit_fits(bigint,timestamptz,integer,bigint),public.consumer_booking_plan(bigint,timestamptz,bigint),public.consumer_staff_free(bigint,bigint,timestamptz,timestamptz,bigint),public.consumer_booking_availability(bigint,date,bigint,bigint),public.consumer_create_booking(bigint,timestamptz,bigint,text,bigint,uuid),public.consumer_change_booking(bigint,timestamptz,timestamptz),public.consumer_cancel_booking(bigint,text) from public,anon,authenticated;
grant execute on function public.consumer_booking_availability(bigint,date,bigint,bigint),public.consumer_create_booking(bigint,timestamptz,bigint,text,bigint,uuid),public.consumer_change_booking(bigint,timestamptz,timestamptz),public.consumer_cancel_booking(bigint,text) to authenticated;
create or replace function public.consumer_deal_stock()
returns table(service_id bigint,remaining_capacity integer) language sql stable security definer set search_path=public,pg_temp as $$
 with rounds as materialized (
  select b.business_id,consumer_sale_round(b.business_id) rotation_key
  from (select distinct business_id from provided_deal_templates) b
 )
 select t.service_id,greatest(0,t.remaining_capacity-(select count(*)::int from reservations r where r.status<>'cancelled' and r.consumer_booking->>'offerId'=(1000000+t.service_id)::text and r.consumer_booking->>'rotationKey'=rounds.rotation_key))
 from provided_deal_templates t join rounds on rounds.business_id=t.business_id;
$$;
revoke all on function public.consumer_deal_stock() from public;
grant execute on function public.consumer_deal_stock() to anon,authenticated;
create index if not exists consumer_booking_owner_start on public.reservations(user_id,start_at desc);
create index if not exists consumer_booking_round_stock on public.reservations((consumer_booking->>'offerId'),(consumer_booking->>'rotationKey')) where status<>'cancelled';
notify pgrst,'reload schema';
commit;
