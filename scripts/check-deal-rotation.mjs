import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile("src/features/consumer/dealSchedule.ts", "utf8");
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { DEAL_ROTATION, rotationRound, currentRotationRound, applyDealRotation, groupActiveTimeDeals, hasActiveSale } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);
const epoch = Date.parse(DEAL_ROTATION.anchor);
const deals = Array.from({ length: 15 }, (_, business) => Array.from({ length: 5 }, (_, service) => ({
  id: business * 5 + service + 1, businessId: business + 1, serviceId: business * 5 + service + 1,
  category: ["hair", "makeup", "aesthetic"][business % 3], scheduleKind: "rotation",
  businessName: `매장 ${business + 1}`, serviceName: `시술 ${service + 1}`, imageUrl: null,
  originalPrice: 100000, price: 100000 - (30 + service * 5) * 1000, discountRate: 30 + service * 5,
  remainingCapacity: 2, endAt: "", description: "", address: "", slots: [],
}))).flat();
const toHome = rows => rows.map(deal => ({ ...deal, remaining_capacity: deal.remainingCapacity }));
const active = (rows, now) => rows.filter(deal => hasActiveSale(deal.startAt, deal.endAt, deal.remainingCapacity, now));
const durations = new Set(), seen = new Set();
let previousBusinesses = new Set();
for (let round = 0; round < 120; round += 1) {
  const window = rotationRound(round), now = window.start + 1000;
  assert.equal(currentRotationRound(window.start).index, round);
  assert.equal(currentRotationRound(window.end - 1).index, round);
  assert.equal(currentRotationRound(window.end).index, round + 1);
  durations.add((window.end - window.start) / 3600000);
  const scheduled = applyDealRotation(deals, now);
  const available = active(scheduled, now);
  assert.equal(available.length, 25);
  const businesses = new Set(available.map(deal => deal.businessId));
  assert.equal(businesses.size, 5);
  assert.ok([...businesses].every(id => !previousBusinesses.has(id)), "next team replaces the previous team");
  assert.equal(new Set(available.map(deal => deal.category)).size, 3);
  for (const id of businesses) seen.add(id);
  assert.deepEqual(applyDealRotation([...deals].reverse(), now).sort((a, b) => a.id - b.id), scheduled, "schedule is independent of response order");
  assert.deepEqual(applyDealRotation(deals, now + 1000), scheduled, "reload does not restart a sale window");
  const groups = groupActiveTimeDeals(toHome(scheduled), now);
  assert.equal(groups.length, 5);
  for (const group of groups) { assert.equal(group.deals.length, 5); assert.equal(group.discountLabel, "30~50%"); }
  assert.equal(active(scheduled, window.end).filter(deal => businesses.has(deal.businessId)).length, 0, "old deals close at the exact deadline");
  previousBusinesses = businesses;
}
assert.deepEqual([...durations].sort(), [1, 2, 3, 4]);
assert.equal(seen.size, 15);
for (const offset of [-86400000, -1, 0, 1, 3600000, 36000000000]) {
  const now = epoch + offset, round = currentRotationRound(now);
  assert.ok(round.start <= now && now < round.end);
}
const window = rotationRound(0), now = epoch + 1000;
const single = { ...toHome(applyDealRotation(deals, now))[0], startAt: new Date(window.start).toISOString(), endAt: new Date(window.end).toISOString() };
assert.equal(groupActiveTimeDeals([single], now)[0].discountLabel, "30%");
assert.equal(groupActiveTimeDeals([single, single], now)[0].deals.length, 1);
assert.equal(groupActiveTimeDeals([{ ...single, endAt: null }], now).length, 0);
assert.equal(groupActiveTimeDeals([{ ...single, remaining_capacity: 0 }], now).length, 0);
assert.equal(groupActiveTimeDeals([{ ...single, startAt: new Date(now + 1).toISOString() }], now).length, 0);
assert.equal(groupActiveTimeDeals([{ ...single, endAt: new Date(now).toISOString() }], now).length, 0);
assert.equal(groupActiveTimeDeals([], now).length, 0);
assert.deepEqual(applyDealRotation([], now), []);
assert.equal(active(applyDealRotation(deals.map(deal => ({ ...deal, remainingCapacity: 0 })), now), now).length, 0);
console.log("PASS 120 rotation rounds: 1–4 hour deadlines, five shops per team, all 15 shops rotate, reload/order stability, active-only grouping, ranges, sold-out/future/expired/undated exclusions");
