import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '../node_modules/.tmp/booking-sql-test/node_modules/@electric-sql/pglite/dist/index.js';

const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated;
    create table businesses(id bigint primary key);
    create schema auth;
    create table auth.users(id uuid primary key);
    insert into auth.users values('11111111-1111-4111-8111-111111111111');
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;`);
  const migration = await readFile('supabase/migrations/20260924000000_deal_kits.sql', 'utf8');
  await db.exec(migration);
  assert.equal((await db.query('select count(*)::int as count from deal_kits')).rows[0].count, 0);
  await db.exec('insert into businesses values(1),(2);');
  await db.exec(migration);
  await db.exec(migration);
  const rows = async (sql) => (await db.query(sql)).rows;
  assert.equal((await rows('select count(*)::int as count from deal_kits'))[0].count, 6);
  assert.equal((await rows('select count(*)::int as count from deal_kit_templates'))[0].count, 3);
  assert.deepEqual((await rows('select min(price) as price from deal_kits group by template_id order by price')).map((row) => row.price), [99000,300000,480000]);
  const refreshSamples = await readFile('supabase/migrations/20260924010000_deal_kit_shop_samples.sql', 'utf8');
  await db.exec(refreshSamples);
  await db.exec(refreshSamples);
  await db.exec(migration);
  assert.equal((await rows('select count(distinct business_id)::int as count from deal_kits where is_demo'))[0].count, 2);
  assert.equal((await rows('select count(distinct items)::int as count from deal_kits where is_demo'))[0].count, 6);
  assert.equal((await rows('select count(*)::int as count from deal_kits'))[0].count, 6);
  assert.equal((await rows("select to_regprocedure('public.can_manage_service_menu(bigint)') as fn"))[0].fn, null);
  await db.exec("update deal_kits set active=false; insert into business_booking_managers values(1,'11111111-1111-4111-8111-111111111111');");
  await db.exec(migration);
  assert.equal((await rows('select count(*)::int as count from deal_kits where active'))[0].count, 0);
  const insert = (business, price = 80, items = "array['커트','클리닉']") => `insert into deal_kits(business_id,title,type,items,original_price,price) values(${business},'헤어 패키지','oneShop',${items},100,${price}) returning id`;
  await db.exec("set role authenticated; set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';");
  const id = (await rows(insert(1)))[0].id;
  await assert.rejects(() => rows(insert(2)), /row-level security/);
  for (const price of [0, -1, 100, 101]) await assert.rejects(() => rows(insert(1, price)), /check constraint/);
  for (const items of ["array['커트']", "array['커트',' ']", "array['커트',null]", "array[]::text[]"]) await assert.rejects(() => rows(insert(1, 80, items)), /check constraint/);
  await db.exec('reset role; set role anon;');
  assert.equal((await rows('select * from deal_kits')).length, 0);
  await assert.rejects(() => rows(insert(1)), /permission denied/);
  await db.exec("reset role; set role authenticated;");
  await rows(`update deal_kits set active=true where id=${id}`);
  await db.exec("set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';");
  assert.equal((await rows(`update deal_kits set price=1 where id=${id} returning id`)).length, 0);
  await db.exec('reset role; set role anon;');
  assert.equal((await rows('select * from deal_kits')).length, 1);
  await db.exec("reset role; set role authenticated; set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';");
  await rows(`update deal_kits set active=false where id=${id}`);
  await db.exec('reset role; set role anon;');
  assert.equal((await rows('select * from deal_kits')).length, 0);
  console.log('PASS: standalone migration without menu helper, empty business table, seed idempotency, minimum prices, manager isolation, validation, anonymous access, sale visibility');
} finally { await db.close(); }
