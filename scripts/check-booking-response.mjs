// Transport failures after commit and tab reload, without network or browser state.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
const api = new URL('../src/api/consumerBooking.ts', import.meta.url);
let committed = 0;
const requests = new Map();
let dropResponse = true;
globalThis.__bookingTestClient = { rpc: async (_name, input) => {
  const signature = JSON.stringify(input);
  let id = requests.get(signature);
  if (!id) { id = String(++committed); requests.set(signature, id); }
  if (dropResponse) { dropResponse=false; return {data:null,error:{message:'Failed to fetch',code:''},status:0}; }
  return {data:id,error:null,status:200};
} };
registerHooks({ resolve(specifier, context, next) {
  if (specifier === './supabase' && (context.parentURL === api.href || context.parentURL?.endsWith('/src/api/auth.ts'))) return {url:'data:text/javascript,export const isSupabaseConfigured=true;export const getSupabaseClient=()=>globalThis.__bookingTestClient;',shortCircuit:true};
  return next(specifier, context);
} });
globalThis.window = new EventTarget();
const storage = new Map();
globalThis.sessionStorage = {getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
const {createSharedBooking,BookingResponseUnknownError}=await import(api);
const {savePendingBooking,readPendingBooking,clearPendingBooking}=await import('../src/features/consumer/booking/pendingBooking.ts');
const request={offerId:1000001,slot:'2026-11-01T14:00:00+09:00',kind:'timedeal',price:50000,requestId:crypto.randomUUID()};
savePendingBooking('a',request);
await assert.rejects(createSharedBooking(request),BookingResponseUnknownError);
assert.equal(committed,1);
assert.equal(readPendingBooking('b',request.offerId),null);
const reloaded=readPendingBooking('a',request.offerId);
assert.deepEqual(reloaded,request);
assert.equal(await createSharedBooking(reloaded),'1');
assert.equal(committed,1,'recovery must reuse the original request, not create twice');
clearPendingBooking('a',request.offerId);assert.equal(readPendingBooking('a',request.offerId),null);
globalThis.__bookingTestClient.rpc=async()=>({data:null,error:{message:'다른 예약이 먼저 접수됐어요.',code:'P0001'},status:400});
await assert.rejects(createSharedBooking(request), e=>!(e instanceof BookingResponseUnknownError)&&/다른 예약/.test(e.message));
globalThis.__bookingTestClient.rpc=async()=>({data:null,error:{message:'gateway timeout',code:'504'},status:504});
await assert.rejects(createSharedBooking(request),BookingResponseUnknownError);
console.log('PASS lost response after commit, same-request recovery after reload, account isolation, definitive rejection and gateway uncertainty');

let signOutOptions;
globalThis.__bookingTestClient.auth={signOut:async options=>{signOutOptions=options;return {error:null};}};
const {requestLogout}=await import('../src/api/auth.ts');
sessionStorage.setItem('userToken','fixture-token');
await requestLogout();assert.deepEqual(signOutOptions,{scope:'local'});assert.equal(sessionStorage.getItem('userToken'),null);
console.log('PASS logout explicitly targets current session');
