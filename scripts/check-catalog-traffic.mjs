// Exercise the actual catalog module with a transport stub, never Supabase.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mock } from 'node:test';
import ts from 'typescript';
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const visitWindow = ts.transpileModule(await readFile('src/features/consumer/booking/visitWindow.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText;
const stubs = {
  './booking/visitWindow': visitWindow,
  './businessAddress': 'export const businessAddress = value => value;',
  '@/api/supabase': 'export const getSupabaseClient = () => globalThis.__catalogDB;',
  '@/data/packageOptions': 'export const SERVICE_CATEGORIES = [{ id: "hair" }];',
  './businessImages': 'export const resolveBusinessImage = value => value;',
  './dealSchedule': 'export const applyDealRotation = deals => deals;',
};
let source = ts.transpileModule(await readFile('src/features/consumer/catalogData.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText;
for (const [name, stub] of Object.entries(stubs)) source = source.replaceAll(`from "${name}"`, `from "${url(stub)}"`);
const calls = [];
let capacity = 4;
let stockError = false;
const fixtures = {
  provided_deal_templates: [{ source_key: 'provided:test:1', business_id: 1, service_id: 1, original_price: 10000, deal_price: 7000, remaining_capacity: 4, start_time: '10:00', end_time: '20:00' }],
  businesses: [{ id: 1, name: '테스트 매장', address: '서울', business_category: { category: 'hair' }, source_details: { opening_hours: '10:00~20:00' } }],
  services: [{ id: 1, name: '테스트 시술', price: 10000, duration_minutes: 60 }],
  business_images: [{ business_id: 1, img_url: '/images/test.jpg' }],
};
globalThis.__catalogDB = {
  from(table) {
    calls.push(table);
    const query = { select() { return query; }, order() { return query; }, in() { return query; }, then(resolve) { return Promise.resolve({ data: fixtures[table], error: null }).then(resolve); } };
    return query;
  },
  async rpc(name) { calls.push(name); return stockError ? { error: { message: 'offline' } } : { data: [{ service_id: 1, remaining_capacity: capacity }], error: null }; },
};
mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-10-29T23:55:00+09:00') });
const { requestConsumerCatalog } = await import(url(source));
const initial = await Promise.all(Array.from({ length: 20 }, () => requestConsumerCatalog()));
assert.equal(calls.length, 5, '20 simultaneous requests share four metadata reads and one stock read');
assert.equal(initial[0][0].remainingCapacity, 4);
capacity = 2;
const changed = await requestConsumerCatalog();
assert.equal(calls.length, 6, 'a stock refresh makes only one request');
assert.equal(changed[0].remainingCapacity, 2);
assert.equal(changed[0].totalCapacity, 4, 'original quota is unchanged');
stockError = true;
await assert.rejects(requestConsumerCatalog(), /수량/);
stockError = false;
await requestConsumerCatalog();
assert.equal(calls.filter(c => c === 'provided_deal_templates').length, 1, 'a stock failure does not discard metadata');
// Seoul midnight is within the metadata TTL: date candidates must still change.
mock.timers.tick(6 * 60_000);
const tomorrow = await requestConsumerCatalog();
assert.equal(calls.filter(c => c === 'provided_deal_templates').length, 2);
assert.notEqual(initial[0][0].regularSlots.at(-1), tomorrow[0].regularSlots.at(-1));
mock.timers.tick(600_001);
await requestConsumerCatalog();
assert.equal(calls.filter(c => c === 'provided_deal_templates').length, 3, 'metadata expires after ten minutes');
mock.timers.reset();
delete globalThis.__catalogDB;
console.log('PASS catalog request coalescing, 5→1 refresh requests, current stock, quota preservation, retry, Seoul midnight and metadata expiry');
