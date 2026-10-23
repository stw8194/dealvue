import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const handlers = {};
const deleted = [];
const navigated = [];
let unregistered = 0;
let skipped = 0;
let claimed = 0;
vm.runInNewContext(fs.readFileSync('public/service-worker.js', 'utf8'), {
  URL,
  caches: { delete: async name => deleted.push(name) },
  self: {
    location: { origin: 'https://www.dealvues.com' },
    addEventListener: (name, fn) => { handlers[name] = fn; },
    skipWaiting: async () => { skipped++; },
    registration: { unregister: async () => { unregistered++; } },
    clients: {
      claim: async () => { claimed++; },
      matchAll: async () => ['https://www.dealvues.com/', 'https://www.dealvues.com/checkout/123', 'https://www.dealvues.com/auth/callback?code=redacted', 'https://other.example/'].map(url => ({ url, navigate: async target => navigated.push(target) })),
    },
  },
});
await new Promise((resolve, reject) => handlers.install({ waitUntil: promise => promise.then(resolve, reject) }));
await new Promise((resolve, reject) => handlers.activate({ waitUntil: promise => promise.then(resolve, reject) }));
assert.equal(skipped, 1);
assert.equal(claimed, 1);
assert.equal(unregistered, 1);
assert.deepEqual(deleted, ['dealvue-v1']);
assert.deepEqual(navigated, ['https://www.dealvues.com/']);
assert.equal(handlers.fetch, undefined, 'retired worker must never intercept requests');

let session = null;
let calls = 0;
let rpcResult = { data: { claimed: true, alreadyClaimed: false }, error: null };
const exports = {};
const source = fs.readFileSync('src/api/coupon.ts', 'utf8').replace(/import .*?;\n/, '');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
  exports,
  getSupabaseClient: () => ({
    auth: { getSession: async () => ({ data: { session }, error: null }) },
    rpc: async () => { calls++; return rpcResult; },
  }),
});
await assert.rejects(exports.requestWelcomeCouponClaim(), /로그인/);
assert.equal(calls, 0, 'guest claim must not call the RPC');
session = { user: { id: 'account-a' } };
assert.equal((await exports.requestWelcomeCouponClaim()).claimed, true);
rpcResult = { data: { claimed: true, alreadyClaimed: true }, error: null };
assert.equal((await exports.requestWelcomeCouponClaim()).alreadyClaimed, true);
rpcResult = { data: null, error: new Error('network failure') };
await assert.rejects(exports.requestWelcomeCouponClaim(), /network failure/);
rpcResult = { data: { claimed: false }, error: null };
await assert.rejects(exports.requestWelcomeCouponClaim(), /쿠폰을 받지 못했습니다/);
console.log('PASS: guest coupon rejection, account RPC success/retry/failure, scoped legacy cache retirement, checkout/auth pages preserved');
