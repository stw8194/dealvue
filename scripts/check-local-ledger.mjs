// Regression checks for problems reproduced in review of the demo booking flow.
// Data: the public catalog is read from Supabase (GET only); bookings, coupons and points are
// stored in the browser's IndexedDB ledger. Nothing is sent to a shop or a payment provider.
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const { chromium } = await import(process.env.DEALVUE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href : "playwright");
const base = process.env.DEALVUE_TEST_URL ?? "http://localhost:5173";
const browser = await chromium.launch({ headless: true });
const errors = [];
const results = [];

async function open(context, path = "/reservation") {
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(base + path, { waitUntil: "networkidle" });
  return page;
}

// Runs inside the page: finds deals and books through the same store the checkout uses.
const helpers = `
  window.__t = {
    store: () => import("/src/features/consumer/booking/store.ts"),
    catalog: async () => (await import("/src/features/consumer/catalog.ts")).requestConsumerCatalog(),
    timing: () => import("/src/features/consumer/dealTiming.ts"),
    ledger: async () => {
      const db = await new Promise(resolve => { const r = indexedDB.open("dealvue-ledger", 1); r.onsuccess = () => resolve(r.result); });
      return new Promise(resolve => { const r = db.transaction("ledger").objectStore("ledger").get("main"); r.onsuccess = () => resolve(r.result ?? null); });
    },
    async book(dealId, slotIndex, { couponId, points = 0, overrideEnd } = {}) {
      const { useBookingStore } = await this.store();
      const { bookingOffer } = await this.timing();
      const deals = await this.catalog();
      let deal = deals.find(item => item.id === dealId);
      if (overrideEnd) deal = { ...deal, endAt: overrideEnd };
      const offer = bookingOffer(deal, Date.now());
      const coupons = (await import("/src/features/consumer/coupons.ts")).useCouponStore.getState().coupons;
      const coupon = coupons.find(item => item.id === couponId);
      const couponDiscount = coupon ? Math.min(coupon.discountAmount, offer.price) : 0;
      const agreedQuote = { kind: offer.kind, price: offer.price, couponDiscount, pointsUsed: points, total: offer.price - couponDiscount - points };
      const slot = offer.slots.filter(value => Date.parse(value) > Date.now())[slotIndex];
      try {
        const reservation = await useBookingStore.getState().createReservation({ deal, slot, agreed: true, agreedQuote, idempotencyKey: crypto.randomUUID(), paymentMethod: "card", couponId, points });
        return { ok: true, id: reservation.id, kind: offer.kind };
      } catch (error) { return { ok: false, message: error.message, name: error.constructor.name }; }
    },
  };`;

async function check(name, fn) {
  try { const note = await fn(); results.push(`PASS ${name}${note ? ` — ${note}` : ""}`); }
  catch (error) { results.push(`FAIL ${name} — ${error.message.split("\n")[0]}`); }
}

async function newContext(options = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ...options });
  await context.addInitScript(helpers);
  return context;
}

// Picks a shop whose time deal is not running, so bookings use the stable menu price.
async function regularDeals(page) {
  return page.evaluate(async () => {
    const { isOpenDeal } = await window.__t.timing();
    const deals = await window.__t.catalog();
    return deals.filter(deal => !isOpenDeal(deal, Date.now()) && deal.regularPrice >= 20000).map(deal => ({ id: deal.id, businessId: deal.businessId, price: deal.regularPrice }));
  });
}

try {
  await check("두 탭 예약: 먼저 연 탭이 나중에 저장해도 앞선 예약이 사라지지 않음", async () => {
    const context = await newContext();
    const a = await open(context), b = await open(context);
    const deals = await regularDeals(a);
    const first = await a.evaluate(id => window.__t.book(id, 2), deals[0].id);
    const second = await b.evaluate(id => window.__t.book(id, 40), deals.find(deal => deal.businessId !== deals[0].businessId).id);
    assert.ok(first.ok && second.ok, JSON.stringify([first, second]));
    const stored = await a.evaluate(() => window.__t.ledger());
    const ids = stored.reservations.map(item => item.id);
    assert.ok(ids.includes(first.id) && ids.includes(second.id), `저장된 예약 ${ids.length}건`);
    await a.reload({ waitUntil: "networkidle" });
    const shown = await a.evaluate(async () => (await window.__t.store()).useBookingStore.getState().reservations.length);
    assert.equal(shown, 2);
    await context.close();
    return "IndexedDB 2건 · 새로고침 후 2건";
  });

  await check("같은 쿠폰을 두 탭에서 동시에 사용하면 한 건만 성공", async () => {
    const context = await newContext();
    const a = await open(context), b = await open(context);
    await a.evaluate(async () => (await import("/src/features/consumer/coupons.ts")).useCouponStore.getState().claimWelcome());
    await b.waitForFunction(async () => (await import("/src/features/consumer/coupons.ts")).useCouponStore.getState().coupons.length === 1);
    const deals = await regularDeals(a);
    const other = deals.find(deal => deal.businessId !== deals[0].businessId);
    const [first, second] = await Promise.all([
      a.evaluate(id => window.__t.book(id, 3, { couponId: "welcome-3000" }), deals[0].id),
      b.evaluate(id => window.__t.book(id, 50, { couponId: "welcome-3000" }), other.id),
    ]);
    const outcomes = [first, second];
    assert.equal(outcomes.filter(item => item.ok).length, 1, JSON.stringify(outcomes));
    assert.match(outcomes.find(item => !item.ok).message, /쿠폰/);
    const stored = await a.evaluate(() => window.__t.ledger());
    assert.equal(stored.reservations.length, 1);
    assert.equal(stored.coupons.filter(coupon => coupon.usedReservationId).length, 1);
    await context.close();
    return outcomes.find(item => !item.ok).message;
  });

  await check("동의 후 타임딜이 마감되면 다른 금액으로 저장하지 않고 재동의 요구", async () => {
    const context = await newContext();
    const page = await open(context);
    const target = await page.evaluate(async () => {
      const { isOpenDeal } = await window.__t.timing();
      return (await window.__t.catalog()).find(deal => isOpenDeal(deal, Date.now()))?.id;
    });
    // Same deal, but its sale window ends 1.5 seconds after the quote was agreed.
    const outcome = await page.evaluate(async id => {
      const endsSoon = new Date(Date.now() + 1500).toISOString();
      const { useBookingStore } = await window.__t.store();
      const { bookingOffer } = await window.__t.timing();
      const deal = { ...(await window.__t.catalog()).find(item => item.id === id), endAt: endsSoon };
      const offer = bookingOffer(deal, Date.now());
      const agreedQuote = { kind: offer.kind, price: offer.price, couponDiscount: 0, pointsUsed: 0, total: offer.price };
      const slot = deal.slots.find(value => Date.parse(value) > Date.now() + 86400000) ?? deal.regularSlots.find(value => Date.parse(value) > Date.now() + 86400000);
      await new Promise(resolve => setTimeout(resolve, 2000));
      try { await useBookingStore.getState().createReservation({ deal, slot, agreed: true, agreedQuote, idempotencyKey: crypto.randomUUID(), paymentMethod: "card" }); return { saved: true }; }
      catch (error) { return { saved: false, name: error.constructor.name, agreed: agreedQuote.total, now: error.quote?.total, kind: error.quote?.kind }; }
    }, target);
    assert.equal(outcome.saved, false, JSON.stringify(outcome));
    assert.equal(outcome.name, "QuoteChangedError");
    assert.equal(outcome.kind, "regular");
    assert.equal((await page.evaluate(() => window.__t.ledger()))?.reservations?.length ?? 0, 0);
    await context.close();
    return `동의 ${outcome.agreed.toLocaleString()}원 → 현재 ${outcome.now.toLocaleString()}원, 저장 0건`;
  });

  await check("결제 화면: 마감 시각이 지나면 동의가 자동 해제됨", async () => {
    const context = await newContext();
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.clock.install({ time: Date.now() });
    await page.goto(base + "/", { waitUntil: "networkidle" });
    const deal = await page.evaluate(async () => {
      const { isOpenDeal } = await window.__t.timing();
      return (await window.__t.catalog()).find(item => isOpenDeal(item, Date.now()));
    });
    await page.goto(`${base}/checkout/${deal.id}`, { waitUntil: "networkidle" });
    await page.selectOption("#booking-day", { index: 1 });
    await page.selectOption("#booking-slot", { index: 1 });
    await page.getByRole("checkbox").check();
    assert.equal(await page.getByRole("button", { name: /시연 결제하기/ }).isEnabled(), true);
    await page.clock.fastForward(Date.parse(deal.endAt) - await page.evaluate(() => Date.now()) + 2000);
    await page.getByText("금액이 바뀌어 동의가 해제되었어요").waitFor({ timeout: 10000 });
    assert.equal(await page.getByRole("checkbox").isChecked(), false);
    assert.equal(await page.getByRole("button", { name: /시연 결제하기/ }).isDisabled(), true);
    await context.close();
  });

  await check("이용 종료 전에는 방문 완료·리뷰 보상이 불가하고, 종료 후 1회만 보상", async () => {
    const context = await newContext();
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.clock.install({ time: Date.now() });
    await page.goto(base + "/reservation", { waitUntil: "networkidle" });
    const deals = await regularDeals(page);
    const booked = await page.evaluate(id => window.__t.book(id, 0), deals[0].id);
    assert.ok(booked.ok, JSON.stringify(booked));
    const early = await page.evaluate(async id => {
      const { useBookingStore } = await window.__t.store();
      const result = {};
      try { await useBookingStore.getState().completeVisit(id); result.complete = "allowed"; } catch (error) { result.complete = error.message; }
      try { await useBookingStore.getState().saveReview(id, { rating: 5, content: "방문 전 리뷰 작성 시도입니다." }); result.review = "allowed"; } catch (error) { result.review = error.message; }
      return result;
    }, booked.id);
    assert.match(early.complete, /끝난 뒤/);
    assert.match(early.review, /이용 완료/);
    await page.goto(`${base}/reservation/${booked.id}`, { waitUntil: "networkidle" });
    assert.equal(await page.getByRole("button", { name: "이용 완료로 표시" }).isDisabled(), true);
    const endAt = await page.evaluate(async id => (await window.__t.store()).useBookingStore.getState().reservations.find(item => item.id === id).endAt, booked.id);
    await page.clock.fastForward(Date.parse(endAt) - await page.evaluate(() => Date.now()) + 60_000);
    await page.getByRole("button", { name: "이용 완료로 표시" }).click();
    await page.getByRole("link", { name: "이용 리뷰 작성" }).click();
    await page.getByLabel("이용 후기").fill("시술이 끝난 뒤 남기는 테스트 리뷰입니다.");
    await page.getByRole("button", { name: "리뷰 저장" }).click();
    await page.getByRole("link", { name: "내 리뷰 수정" }).click();
    await page.getByLabel("이용 후기").fill("수정한 리뷰입니다. 보상은 한 번만 받아야 해요.");
    await page.getByRole("button", { name: "리뷰 수정" }).click();
    await page.getByRole("link", { name: "내 리뷰 수정" }).waitFor();
    const points = (await page.evaluate(() => window.__t.ledger())).pointHistory.filter(entry => entry.reason.startsWith("방문 리뷰 작성"));
    assert.equal(points.length, 1);
    assert.equal(points[0].amount, 100);
    await context.close();
    return "종료 전 거부, 종료 후 완료·리뷰, 보상 100P × 1";
  });

  await check("패키지: 구성 시술의 예약 시간 합산, 샵+샵은 매장별 예약 2건과 이동시간", async () => {
    const context = await newContext();
    const page = await open(context, "/package");
    const kits = await page.evaluate(async () => (await import("/src/features/consumer/dealKits.ts")).readDealKits());
    const color = kits.find(kit => kit.id === 111), magic = kits.find(kit => kit.id === 114), interview = kits.find(kit => kit.id === 121);
    assert.equal(color.legs[0].durationMinutes, 210); assert.equal(color.legs[0].displayMinutes, 200);
    assert.equal(magic.legs[0].durationMinutes, 240); assert.equal(magic.legs[0].displayMinutes, 230);
    assert.equal(interview.legs.length, 2);
    await page.goto(`${base}/checkout/kit/121`, { waitUntil: "networkidle" });
    await page.selectOption("#booking-day", { index: 1 });
    await page.selectOption("#booking-slot", { index: 1 });
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /시연 결제하기/ }).click();
    await page.waitForURL("**/booking/complete/**");
    const legs = (await page.evaluate(() => window.__t.ledger())).reservations.sort((x, y) => x.legIndex - y.legIndex);
    assert.equal(legs.length, 2);
    assert.notEqual(legs[0].businessId, legs[1].businessId);
    assert.equal(legs[0].groupId, legs[1].groupId);
    assert.equal(Date.parse(legs[1].reservedAt) - Date.parse(legs[0].endAt), 30 * 60_000);
    assert.equal(legs[0].price + legs[1].price, interview.price);
    // A shop's opening hours must contain its own leg.
    const fits = await page.evaluate(async rows => {
      const { fitsOpeningHours } = await import("/src/features/consumer/booking/packageSchedule.ts");
      const kits = await (await import("/src/features/consumer/dealKits.ts")).readDealKits();
      const kit = kits.find(item => item.id === 121);
      return rows.map((row, index) => fitsOpeningHours(Date.parse(row.reservedAt), kit.legs[index].durationMinutes, kit.legs[index].openingHours, kit.legs[index].closedDays));
    }, legs);
    assert.deepEqual(fits, [true, true]);
    await page.goto(`${base}/reservation/${legs[0].id}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "예약 취소" }).click();
    await page.getByRole("button", { name: "취소 확정" }).click();
    await page.getByText("시연 예약 취소", { exact: true }).waitFor();
    const after = (await page.evaluate(() => window.__t.ledger())).reservations;
    assert.ok(after.every(item => item.status === "cancelled"));
    await context.close();
    return "210/200분, 240/230분, 2개 매장 30분 간격, 패키지 일괄 취소";
  });

  await check("딜키트 조회 오류는 '상품 없음'이 아니라 오류로 표시", async () => {
    const context = await newContext();
    await context.route("**/rest/v1/deal_kits*", route => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "test error" }) }));
    const page = await open(context, "/business/42");
    const kits = page.getByRole("region", { name: "딜키트", exact: true });
    await kits.getByRole("alert").waitFor();
    assert.equal(await kits.getByText("판매 중인 상품 없음", { exact: true }).count(), 0);
    await page.goto(`${base}/checkout/kit/111`, { waitUntil: "networkidle" });
    await page.getByText("예약 정보를 불러오지 못했습니다").waitFor();
    await context.close();
  });

  await check("두 탭에서 같은 포인트를 동시에 쓰면 한 번만 차감", async () => {
    const context = await newContext();
    const a = await open(context, "/rewards"), b = await open(context, "/rewards");
    await a.evaluate(async () => (await import("/src/features/consumer/engagement/store.ts")).useEngagementStore.getState().checkIn());
    await b.waitForFunction(async () => (await import("/src/features/consumer/engagement/store.ts")).useEngagementStore.getState().pointHistory.length === 1);
    await Promise.all([a, b].map(page => page.evaluate(async () => (await import("/src/features/consumer/engagement/store.ts")).useEngagementStore.getState().adjustPoints("동시 차감 테스트", -10))));
    await a.waitForTimeout(800);
    const stored = await a.evaluate(() => window.__t.ledger());
    const spends = stored.pointHistory.filter(entry => entry.reason === "동시 차감 테스트");
    assert.equal(spends.length, 1);
    assert.equal(stored.pointHistory.reduce((sum, entry) => sum + entry.amount, 0), 0);
    const shown = await b.evaluate(async () => (await import("/src/features/consumer/engagement/store.ts")).useEngagementStore.getState().pointHistory.reduce((sum, entry) => sum + entry.amount, 0));
    assert.equal(shown, 0);
    await context.close();
    return "잔액 10P에서 동시 10P 차감 2회 → 1회만 저장, 잔액 0";
  });

  await check("취소 시점: 무료 취소 기한 안/밖을 예약 당시 규정으로 구분", async () => {
    const context = await newContext();
    const page = await open(context);
    const deals = await regularDeals(page);
    const outcome = await page.evaluate(async id => {
      const { useBookingStore } = await window.__t.store();
      const near = await window.__t.book(id, 0), far = await window.__t.book(id, 60);
      await useBookingStore.getState().cancelReservation(near.id);
      await useBookingStore.getState().cancelReservation(far.id);
      const rows = useBookingStore.getState().reservations;
      const pick = row => ({ term: row.cancelTerm, hours: row.policy.freeCancelHours, hoursAhead: Math.round((Date.parse(row.reservedAt) - Date.now()) / 3600000), payment: row.paymentStatus });
      return { near: pick(rows.find(row => row.id === near.id)), far: pick(rows.find(row => row.id === far.id)) };
    }, deals[0].id);
    assert.equal(outcome.far.term, "free");
    assert.equal(outcome.near.term, outcome.near.hoursAhead >= outcome.near.hours ? "free" : "needs_review");
    assert.equal(outcome.far.payment, "test_cancelled");
    await context.close();
    return JSON.stringify(outcome);
  });

  await check("놀이터 진입만으로 포인트가 지급되지 않고, 출석 버튼으로 1회 지급", async () => {
    const context = await newContext();
    const page = await open(context, "/rewards");
    await page.waitForTimeout(500);
    assert.equal((await page.evaluate(async () => (await import("/src/features/consumer/engagement/store.ts")).useEngagementStore.getState().pointHistory.length)), 0);
    await page.getByRole("button", { name: /오늘 출석하고 10 P 받기/ }).click();
    await page.getByText("오늘 출석 완료").waitFor();
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.getByRole("button", { name: /오늘 출석하고/ }).count(), 0);
    const history = (await page.evaluate(() => window.__t.ledger())).pointHistory;
    assert.equal(history.length, 1); assert.equal(history[0].amount, 10);
    await context.close();
  });
} finally {
  await browser.close();
}
console.log(results.join("\n"));
if (errors.length) console.log("page errors:", [...new Set(errors)].join(" | "));
const failed = results.filter(line => line.startsWith("FAIL")).length + (errors.length ? 1 : 0);
console.log(failed ? `${failed} problem(s)` : "ALL PASS");
process.exitCode = failed ? 1 : 0;
