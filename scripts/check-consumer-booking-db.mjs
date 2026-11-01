process.on('uncaughtException',e=>{console.error(e.message,e.detail??'',e.where??'',e.position??'',e.stack?.split('\n').find(l=>l.includes('check-consumer'))??'');process.exit(1);});
// Isolated PostgreSQL checks; never connects to production.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const modulePath=process.env.PGLITE_MODULE_PATH??'@electric-sql/pglite';
const {PGlite}=await import(modulePath);
const {btree_gist}=await import(modulePath.replace(/\/index\.js$/,'/contrib/btree_gist.js'));
const db=new PGlite({extensions:{btree_gist}});
await db.exec(`create role anon;create role authenticated;create schema auth;
grant usage on schema public,auth to anon,authenticated;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create type reservation_status_enum as enum('waiting','confirmed','cancelled','done','no_show');
create table users(id uuid primary key,name text);
create table businesses(id bigint primary key,name text,address text,source_details jsonb);
create table business_category(business_id bigint,category text);
create table staff(id bigint primary key,business_id bigint,name text);
create table services(id bigint primary key,business_id bigint,name text,price bigint,duration_minutes smallint,display_duration_minutes int,source_key text,exclusive_group text);
create table provided_deal_templates(source_key text,business_id bigint,service_id bigint,start_time time,end_time time,original_price bigint,deal_price bigint,remaining_capacity int,source_details jsonb);
create table business_booking_hours(business_id bigint,weekday smallint,opens_minute int,closes_minute int,closed boolean);
create table staff_booking_hours(staff_id bigint,weekday smallint,starts_minute int,ends_minute int,closed boolean);
create table booking_time_off(business_id bigint,staff_id bigint,start_at timestamptz,end_at timestamptz);
create table business_booking_settings(business_id bigint,booking_mode text);
create table business_booking_managers(business_id bigint,user_id uuid);
create table reservations(id bigint generated always as identity primary key,user_id uuid references users(id),business_id bigint,staff_id bigint,service_id bigint,status reservation_status_enum,start_at timestamptz,end_at timestamptz,price bigint,booking_channel text,booking_service_ids bigint[],booking_summary text,booking_items jsonb,booking_request_id uuid,created_at timestamptz default now(),updated_at timestamptz default now());
create extension btree_gist;
alter table reservations add constraint reservations_no_staff_overlap exclude using gist(staff_id with =,tstzrange(start_at,end_at,'[)') with &&) where(status<>'cancelled' and staff_id is not null);
`);
const data=JSON.parse(await readFile('src/data/provided-catalog.json','utf8'));
let sid=0;
for(let i=0;i<data.businesses.length;i++){
 const b=data.businesses[i],bid=i+1;
 await db.query('insert into businesses values($1,$2,$3,$4)',[bid,b.name,b.address,b.source_details]);
 await db.query('insert into business_category values($1,$2)',[bid,b.category]);
 for(let st=1;st<=2;st++)await db.query('insert into staff values($1,$2,$3)',[bid*10+st,bid,'담당자'+st]);
 for(const s of b.services){sid++;
  await db.query('insert into services values($1,$2,$3,$4,$5,$6,$7,null)',[sid,bid,s.name,s.price,s.duration_minutes,s.display_duration_minutes,s.source_key]);
  const t=s.deal;await db.query('insert into provided_deal_templates values($1,$2,$3,$4,$5,$6,$7,$8,$9)',[s.source_key,bid,sid,t.start_time,t.end_time,t.original_price,t.deal_price,t.capacity,{discount_rate:t.discount_rate}]);
 }
}
const migration=await readFile('database/consumer-booking.sql','utf8');
await db.exec(migration);await db.exec(migration);
// Exercise the deployable patch against the old finish-inside-window definition.
const planDef=(await db.query("select pg_get_functiondef('public.consumer_booking_plan(bigint,timestamptz,bigint)'::regprocedure) def")).rows[0].def;
await db.exec(planDef.replace("::time<t.end_time", "::time+make_interval(mins=>minutes)<=t.end_time").replace("::time>=t.end_time", "::time+make_interval(mins=>minutes)>t.end_time"));
const startWindowPatch=await readFile('database/consumer-booking-start-window.sql','utf8');
await db.exec(startWindowPatch);await db.exec(startWindowPatch);
assert.equal((await db.query("select pg_get_functiondef('public.consumer_booking_plan(bigint,timestamptz,bigint)'::regprocedure) def")).rows[0].def,planDef);
// Reference definitions reproduce the previous 48-start implementation only in
// this isolated fixture. Compare complete results before trusting a faster scan.
const perf=await readFile('database/consumer-booking-performance.sql','utf8');
await db.exec(perf);await db.exec(perf);
const availableDef=(await db.query("select pg_get_functiondef('public.consumer_booking_availability(bigint,date,bigint,bigint)'::regprocedure) def")).rows[0].def;
const oldAvailability=availableDef.replace('public.consumer_booking_availability(', 'public.test_previous_availability(')
 .replace(/ -- Only generate starts[\s\S]*? for start_time in select generate_series[^\n]* loop/, " for start_time in select generate_series(p_date::timestamp at time zone 'Asia/Seoul',((p_date+1)::timestamp at time zone 'Asia/Seoul')-interval '30 minutes',interval '30 minutes') loop");
assert.notEqual(oldAvailability,availableDef);
await db.exec(oldAvailability);
await db.exec(`create function test_previous_stock() returns table(service_id bigint,remaining_capacity integer) language sql stable security definer set search_path=public,pg_temp as $$
 select t.service_id,greatest(0,t.remaining_capacity-(select count(*)::int from reservations r where r.status<>'cancelled' and r.consumer_booking->>'offerId'=(1000000+t.service_id)::text and r.consumer_booking->>'rotationKey'=consumer_sale_round(t.business_id))) from provided_deal_templates t;
$$`);
await db.exec('create trigger guard_salon_reservation before insert or update on reservations for each row execute function guard_salon_reservation()');
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
async function login(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id??'']);await db.exec(id?'set role authenticated':'set role anon');}
const query=async(sql,args=[])=> (await db.query(sql,args)).rows;
const day=(await query("select ((now() at time zone 'Asia/Seoul')::date+1)::text d"))[0].d;
// Check all 75 actual templates before synthetic fixtures can hide source-data defects.
await db.exec('reset role');
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);
const rotationDef=(await query("select pg_get_functiondef('public.consumer_sale_round(bigint)'::regprocedure) def"))[0].def;
await db.exec("create or replace function consumer_sale_round(p_business bigint) returns text language sql stable security definer set search_path=public,pg_temp as $$select 'fixture-active'::text$$");
let checked=0, noOpeningSlot=[];
for (const template of (await query('select t.*,s.duration_minutes from provided_deal_templates t join services s on s.id=t.service_id order by t.service_id'))) {
 let valid=[];
 for(let offset=1;offset<=7&&!valid.length;offset++) {
  const date=(await query("select ((now() at time zone 'Asia/Seoul')::date+$1::int)::text d",[offset]))[0].d;
  valid=(await query('select consumer_booking_availability($1,$2) slots',[1000000+template.service_id,date]))[0].slots.filter(slot => slot.kind==='timedeal');
 }
 if (!valid.length) noOpeningSlot.push(template.source_key);
 for(const slot of valid) {
  const minute=new Date(Date.parse(slot.start_at)+9*3600000).toISOString().slice(11,19);
  assert.ok(minute>=template.start_time&&minute<template.end_time);
  assert.equal((Date.parse(slot.end_at)-Date.parse(slot.start_at))/60000,template.duration_minutes);
 }
 checked++;
}
assert.equal(checked,75);
assert.deepEqual(noOpeningSlot,['provided:riobella:service:5']); // 19:30 +90min > shop closes20:30.
await db.exec(rotationDef);
console.log('PASS 75 real catalog templates: start-window eligibility and full-duration occupancy; one existing closing-hours conflict identified');
// Keep the synthetic fixture open irrespective of the weekday and rotation.
await db.query("update businesses set source_details=source_details||'{\"closed_days\":\"\"}'::jsonb");
await db.query('update services set duration_minutes=180,display_duration_minutes=170 where id=1');
await db.query('update provided_deal_templates set remaining_capacity=0 where service_id=1');
const at=t=>`${day}T${t}:00+09:00`;
async function availability(offer,staff=null,exclude=null){return (await query('select consumer_booking_availability($1,$2,$3,$4) slots',[offer,day,staff,exclude]))[0].slots;}
async function book(offer,time,staff,request=crypto.randomUUID()){
 const slot=(await availability(offer,staff)).find(x=>Date.parse(x.start_at)===Date.parse(at(time)));assert.ok(slot,`slot ${time}`);
 return {id:(await query('select consumer_create_booking($1,$2,$3,$4,$5,$6) id',[offer,at(time),staff,slot.kind,slot.price,request]))[0].id,slot,request};
}
await login(null);await assert.rejects(query('select consumer_booking_availability(1000001,$1)',[day]),/permission denied/);
await login(a);const first=await book(1000001,'14:00',11);
let row=(await query('select * from reservations where id=$1',[first.id]))[0];assert.equal((Date.parse(row.end_at)-Date.parse(row.start_at))/60000,180);
const duplicate=(await query('select consumer_create_booking($1,$2,$3,$4,$5,$6) id',[1000001,at('14:00'),11,first.slot.kind,first.slot.price,first.request]))[0].id;assert.equal(duplicate,first.id);
await assert.rejects(query('select consumer_create_booking($1,$2,$3,$4,$5,$6)',[1000001,at('14:30'),11,first.slot.kind,first.slot.price,first.request]),/이미 사용/);
await login(b);let slots=await availability(1000001,11);
for(const time of ['14:00','14:30','15:00','16:30'])assert.equal(slots.find(s=>Date.parse(s.start_at)===Date.parse(at(time))).available,false,time);
assert.equal(slots.find(s=>Date.parse(s.start_at)===Date.parse(at('17:00'))).available,true);
await assert.rejects(book(1000001,'15:00',11),/다른 예약/);
assert.equal((await query('select count(*) n from reservations'))[0].n,0,'RLS hides other account');
const other=await book(1000001,'14:00',12);
await assert.rejects(query('select consumer_cancel_booking($1)',[first.id]),/찾을 수 없/);
await assert.rejects(query('update reservations set price=1 where id=$1',[other.id]),/permission denied/);
await assert.rejects(query('select consumer_booking_plan(1000001,$1)',[at('14:00')]),/permission denied/);
await login(a);await assert.rejects(query('select consumer_change_booking($1,$2,$3)',[first.id,at('14:30'),at('13:00')]),/다른 화면/);
await query('select consumer_change_booking($1,$2,$3)',[first.id,at('14:30'),at('14:00')]);
await login(b);const before=(await query('select start_at from reservations where id=$1',[other.id]))[0].start_at;
// Another booking on the same chosen staff blocks a change and preserves the old start.
const later=await book(1000001,'18:00',12);
await assert.rejects(query('select consumer_change_booking($1,$2,$3)',[other.id,at('16:00'),before]),/이미 예약/);
assert.equal(Date.parse((await query('select start_at from reservations where id=$1',[other.id]))[0].start_at),Date.parse(before));
await login(a);await query('select consumer_cancel_booking($1,$2)',[first.id,'확인']);await query('select consumer_cancel_booking($1)',[first.id]);
await login('33333333-3333-4333-8333-333333333333');assert.equal((await availability(1000001,11)).find(s=>Date.parse(s.start_at)===Date.parse(at('14:00'))).available,true);
for(const [offer,staff,excluded] of [[1000001,11,null],[1000001,12,null],[1000001,null,null],[1000001,12,other.id],[1000002,null,null],[2000121,null,null]]) {
 const previous=(await query('select test_previous_availability($1,$2,$3,$4) slots',[offer,day,staff,excluded]))[0].slots;
 assert.deepEqual(await availability(offer,staff,excluded),previous,`optimized availability ${offer}/${staff}/${excluded}`);
}
console.log('PASS optimized availability matches previous results, including packages, staff, overlaps and excluded booking');
console.log('PASS shared staff full interval, adjacent boundary, different staff, server duration, cancellation release, idempotent retries, stale edits, failed-change rollback, account RLS and direct-write denial');
// Package atomicity: occupy both staff at leg 2, confirm no leg 1 survives a failed transaction.
await login(a);const kitOffer=2000121;
let kitSlots=await availability(kitOffer);const candidate=kitSlots.find(s=>s.available);assert.ok(candidate);
await db.exec('reset role');
const plan=(await query('select consumer_booking_plan($1,$2) p',[kitOffer,candidate.start_at]))[0].p;
const leg=plan.legs[1];
for(const st of [leg.businessId*10+1,leg.businessId*10+2]) await db.query("insert into reservations(user_id,business_id,staff_id,service_id,status,start_at,end_at,price) values($1,$2,$3,$4,'confirmed',$5,$6,1)",[b,leg.businessId,st,leg.serviceIds[0],leg.startAt,leg.endAt]);
await login(a);const countBefore=(await query('select count(*) n from reservations'))[0].n;
await assert.rejects(query('select consumer_create_booking($1,$2,null,$3,$4,$5)',[kitOffer,candidate.start_at,'package',plan.price,crypto.randomUUID()]),/다른 예약/);
assert.equal((await query('select count(*) n from reservations'))[0].n,countBefore);
console.log('PASS package second-leg conflict rolls back every leg');
await db.exec('reset role');
const saleBusiness=(await query('select business_id from provided_deal_templates where consumer_sale_round(business_id) is not null limit 1'))[0].business_id;
await db.query("update services set duration_minutes=60 where business_id=$1",[saleBusiness]);
await db.query("update provided_deal_templates set start_time='14:00',end_time='18:00',remaining_capacity=1 where business_id=$1",[saleBusiness]);
const service=(await query('select id from services where business_id=$1 order by id limit 1',[saleBusiness]))[0].id;
await login(a);const offered=1000000+service;
const activeSlots=await availability(offered);
assert.equal(activeSlots.find(s=>Date.parse(s.start_at)===Date.parse(at('14:00'))).kind,'timedeal');
assert.equal(activeSlots.find(s=>Date.parse(s.start_at)===Date.parse(at('17:30'))).kind,'timedeal','treatment may finish after discount window');
assert.equal(activeSlots.find(s=>Date.parse(s.start_at)===Date.parse(at('18:00'))).kind,'regular','end boundary excluded');
let discounted=(await availability(offered)).find(s=>s.kind==='timedeal'&&s.available);assert.ok(discounted);
const discountId=(await query('select consumer_create_booking($1,$2,null,$3,$4,$5) id',[offered,discounted.start_at,'timedeal',discounted.price,crypto.randomUUID()]))[0].id;
await query('select consumer_change_booking($1,$2,$3)',[discountId,at('17:30'),discounted.start_at]);
assert.equal(Date.parse((await query('select end_at from reservations where id=$1',[discountId]))[0].end_at),Date.parse(at('18:30')));
await assert.rejects(query('select consumer_change_booking($1,$2,$3)',[discountId,at('18:00'),at('17:30')]),/타임딜 방문 시간/);
await login(b);let exhausted=(await availability(offered)).find(s=>Date.parse(s.start_at)===Date.parse(discounted.start_at));assert.equal(exhausted.kind,'regular');
await assert.rejects(query('select consumer_create_booking($1,$2,null,$3,$4,$5)',[offered,discounted.start_at,'timedeal',discounted.price,crypto.randomUUID()]),/금액이 바뀌/);
let outside=(await availability(offered)).find(s=>Date.parse(s.start_at)===Date.parse(at('18:00')));assert.equal(outside.kind,'regular');
assert.equal((await query('select remaining_capacity from consumer_deal_stock() where service_id=$1',[service]))[0].remaining_capacity,0);
await login(null);
const stock=await query('select * from consumer_deal_stock()');assert.equal(stock.length,75);assert.deepEqual(Object.keys(stock[0]).sort(),['remaining_capacity','service_id']);
await assert.rejects(query('select * from reservations'),/permission denied/);
console.log('PASS server sale rotation, start-time visit window and full-duration staff occupancy, quota depletion, forged/stale discount rejection and anonymous stock without reservation disclosure');


await login(a);
for(const date of [day,(await query("select ((now() at time zone 'Asia/Seoul')::date)::text d"))[0].d]) {
 for(const hours of ['09:15~19:45','10:00~10:30','10:00~20:00']) {
  await db.exec('reset role');
  await db.query("update businesses set source_details=jsonb_build_object('opening_hours',$1::text,'closed_days','') where id=1",[hours]);
  await login(a);
  const args=[1000001,date,null,null];
  const current=(await query('select consumer_booking_availability($1,$2,$3,$4) slots',args))[0].slots;
  const before=(await query('select test_previous_availability($1,$2,$3,$4) slots',args))[0].slots;
  assert.deepEqual(current,before,`opening bounds ${date}/${hours}`);
 }
}
const currentStock=await query('select * from consumer_deal_stock() order by service_id');
const oldStock=await query('select * from test_previous_stock() order by service_id');
assert.deepEqual(currentStock,oldStock);
console.log('PASS optimized opening-hour bounds, partial hours, too-short day, today and stock aggregation preserve previous results');
await db.close();
