import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "../node_modules/.tmp/booking-sql-test/node_modules/@electric-sql/pglite/dist/index.js";

const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated;
    create type business_category_enum as enum('hair','makeup','aesthetic','nail','eyelash');
    create table businesses(id bigint generated always as identity primary key,name text,address text,number text,description text,latitude double precision,longitude double precision);
    create table services(id bigint generated always as identity primary key,business_id bigint references businesses(id),name text,description text,price bigint,duration_minutes smallint check(duration_minutes>0 and duration_minutes%30=0));
    create table business_category(id bigint generated always as identity primary key,business_id bigint references businesses(id),category business_category_enum);
    create table business_images(id bigint generated always as identity primary key,business_id bigint references businesses(id),img_url text);
    create table reservations(id bigint primary key,business_id bigint references businesses(id));
    insert into businesses(name,address) values('기존 매장','기존 주소');
    insert into reservations values(1,1);`);
  const sql = await readFile("supabase/import_provided_catalog.sql", "utf8");
  await db.exec(sql);
  await db.exec(sql);
  const rows = async (sql) => (await db.query(sql)).rows;
  assert.equal((await rows("select count(*)::int n from businesses where source_key like 'provided:%'"))[0].n,15);
  assert.equal((await rows("select count(*)::int n from services where source_key like 'provided:%'"))[0].n,75);
  assert.equal((await rows("select count(*)::int n from business_images"))[0].n,72);
  assert.equal((await rows("select count(*)::int n from provided_deal_templates"))[0].n,75);
  assert.equal((await rows("select count(*)::int n from business_category"))[0].n,15);
  assert.equal((await rows("select sum(jsonb_array_length(source_details->'review_samples'))::int n from businesses"))[0].n,75);
  assert.equal((await rows("select sum(jsonb_array_length(source_details->'review_images'))::int n from businesses"))[0].n,68);
  assert.equal((await rows("select count(*)::int n from services where duration_minutes != display_duration_minutes"))[0].n,46);
  assert.equal((await rows("select name from businesses where id=1"))[0].name,'기존 매장');
  assert.equal((await rows("select business_id from reservations where id=1"))[0].business_id,1);
  assert.equal(Number((await rows("select price from services where source_key='provided:ardien:service:3'"))[0].price),45000);
  assert.equal(Number((await rows("select price from services where source_key='provided:ardien:service:4'"))[0].price),190000);
  await db.exec("set role anon");
  assert.equal((await rows("select count(*)::int n from provided_deal_templates"))[0].n,75);
  await assert.rejects(() => db.query("delete from provided_deal_templates"),/permission denied/);
  console.log("PASS supplied import and rerun: 15 shops, 75 services, 75 deal templates, 75 review samples, 72 representative and 68 review images; original durations and selected prices; existing reservations preserved; anonymous read-only access");
} finally { await db.close(); }
