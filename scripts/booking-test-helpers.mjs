// Browser-only auth fixtures. No real accounts, email, or OAuth provider calls.
import { readFile } from "node:fs/promises";

export const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
export const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
const env = Object.fromEntries((await readFile(".env", "utf8")).split(/\r?\n/).flatMap(line => {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  return match ? [[match[1], match[2].trim().replace(/^['"]|['"]$/g, "")]] : [];
}));
const storageKey = `sb-${new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0]}-auth-token`;

export function sessionFor(id = TEST_USER_ID) {
  const user = { id, aud: "authenticated", role: "authenticated", email: "booking-test@example.invalid", user_metadata: { nickname: "예약 테스트" }, app_metadata: { provider: "email", providers: ["email"] }, created_at: "2026-01-01T00:00:00Z" };
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  return { access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: id, exp: 4102444800, role: "authenticated" })}.test-only`, refresh_token: "test-only", token_type: "bearer", expires_in: 31536000, expires_at: 4102444800, user };
}

export async function installAuthFixture(context, { userId = TEST_USER_ID, mockSignup = false, firstProfileDelayMs = 0 } = {}) {
  let profileReads = 0;
  const account = request => {
    try { return JSON.parse(Buffer.from(request.headers().authorization.split(".")[1], "base64url").toString()).sub; }
    catch { return TEST_USER_ID; }
  };
  const json = (route, data) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
  await context.route(`${env.VITE_SUPABASE_URL}/rest/v1/**`, route => {
    if (new URL(route.request().url()).pathname.endsWith("/rpc/has_claimed_coupon")) return json(route, false);
    if (!["GET", "HEAD", "OPTIONS"].includes(route.request().method())) throw new Error(`Browser tests must not mutate the live database: ${route.request().method()} ${new URL(route.request().url()).pathname}`);
    // Public catalog reads use the public key; fixture JWTs never reach Supabase.
    return route.fallback({ headers: { ...route.request().headers(), authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` } });
  });
  await context.route(`${env.VITE_SUPABASE_URL}/auth/v1/**`, route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/user")) return json(route, sessionFor(account(route.request())).user);
    if (path.endsWith("/token")) return json(route, sessionFor(TEST_USER_ID));
    if (mockSignup && path.endsWith("/signup")) return json(route, sessionFor(TEST_USER_ID));
    return route.abort(); // Real OAuth, signup, and email delivery are never exercised here.
  });
  await context.route(`${env.VITE_SUPABASE_URL}/rest/v1/users?*`, async route => {
    if (profileReads++ === 0 && firstProfileDelayMs) await new Promise(resolve => setTimeout(resolve, firstProfileDelayMs));
    const id = account(route.request());
    return json(route, { id, email: "booking-test@example.invalid", name: "예약 테스트" });
  });
  await context.route(`${env.VITE_SUPABASE_URL}/rest/v1/reservations?*`, route => {
    if (route.request().method() !== "GET") throw new Error("Browser tests must not write server reservations");
    return json(route, []);
  });
  await context.route(`${env.VITE_SUPABASE_URL}/rest/v1/user_coupons?*`, route => {
    if (route.request().method() !== "GET") throw new Error("Browser tests must not write server coupons");
    return json(route, []);
  });
  if (userId) await context.addInitScript(({ key, session }) => {
    if (!sessionStorage.getItem("dealvue-test-auth-seeded")) {
      localStorage.setItem(key, JSON.stringify(session));
      sessionStorage.setItem("dealvue-test-auth-seeded", "true");
    }
  }, { key: storageKey, session: sessionFor(userId) });
}

export async function switchAccount(page, userId) {
  await page.evaluate(({ key, session }) => {
    if (session) localStorage.setItem(key, JSON.stringify(session));
    else localStorage.removeItem(key);
  }, { key: storageKey, session: userId ? sessionFor(userId) : null });
  await page.reload({ waitUntil: "networkidle" });
}

export async function chooseBookingSlot(page) {
  await page.getByRole("radiogroup", { name: "방문 날짜", exact: true }).waitFor();
  await page.locator('label:has(input[name="booking-slot"])').first().click();
}
