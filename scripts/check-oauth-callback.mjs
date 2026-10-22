// Tests real SDK callback initialization against intercepted OAuth responses.
// No provider login, real credentials, or server account creation.
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { installAuthFixture, sessionFor, TEST_USER_ID } from "./booking-test-helpers.mjs";

const { chromium } = await import(process.env.DEALVUE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href : "playwright");
const base = process.env.DEALVUE_TEST_URL ?? "http://localhost:5173";
const browser = await chromium.launch({ headless: true });
const errors = [];
const destination = "/reservation?source=oauth";
async function fixture(userId = null) {
  const context = await browser.newContext();
  await context.route("**/*", route => route.request().url().startsWith(base) ? route.continue() : route.abort());
  await installAuthFixture(context, { userId });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  return { context, page };
}
async function startPKCE(page) {
  await page.goto(base + "/auth/login", { waitUntil: "networkidle" });
  return page.evaluate(async destination => {
    const { getSupabaseClient } = await import("/src/api/supabase.ts");
    const { data, error } = await getSupabaseClient().auth.signInWithOAuth({ provider: "custom:kakao", options: { redirectTo: location.origin + "/auth/callback", skipBrowserRedirect: true } });
    if (error) throw error;
    const url = new URL(data.url);
    if (!url.searchParams.get("code_challenge")) throw new Error("OAuth must generate a PKCE challenge");
    if (url.searchParams.get("code_challenge_method").toLowerCase() !== "s256") throw new Error("PKCE must use S256");
    const callback = new URL(url.searchParams.get("redirect_to"));
    callback.searchParams.set("code", "test-only-authorization-code");
    sessionStorage.setItem("dealvue-login-return", JSON.stringify({ path: destination, expiresAt: Date.now() + 60000 }));
    return callback.pathname + callback.search;
  }, destination);
}
try {
  for (const fragment of [false, true]) {
    // Even a previous session must not conceal a failed new OAuth attempt.
    const { context, page } = await fixture(TEST_USER_ID);
    const params = new URLSearchParams({ error: "server_error", error_code: "unexpected_failure", error_description: "OAuth provider could not fetch user information" });
    await page.goto(`${base}/auth/callback${fragment ? "#" : "?"}${params}`);
    await page.getByText("OAuth provider could not fetch user information", { exact: true }).waitFor();
    await page.getByRole("button", { name: "로그인으로 돌아가기", exact: true }).waitFor();
    assert.ok(page.url().includes("/auth/callback"));
    await context.close();
  }
  console.log("PASS callback query/fragment errors retain the upstream reason, including with an existing session");

  for (const succeeds of [true, false]) {
    const { context, page } = await fixture();
    let exchanges = 0;
    await context.route("**/auth/v1/token?grant_type=pkce", async route => {
      exchanges++;
      const input = route.request().postDataJSON();
      assert.equal(input.auth_code, "test-only-authorization-code");
      assert.ok(input.code_verifier.length >= 43);
      // Keep initialization in flight through React StrictMode's effect replay.
      await new Promise(resolve => setTimeout(resolve, 150));
      const success = succeeds && exchanges === 1;
      return route.fulfill({ status: success ? 200 : 400, contentType: "application/json", body: JSON.stringify(success ? sessionFor() : { code: "bad_code_verifier", message: "OAuth code exchange failed in test" }) });
    });
    const callback = await startPKCE(page);
    await page.goto(base + callback, { waitUntil: "networkidle" });
    if (succeeds) {
      await page.waitForURL(base + destination);
      assert.equal(await page.evaluate(() => sessionStorage.getItem("dealvue-login-return")), null);
      assert.equal(await page.evaluate(async () => (await import("/src/store/useAuthStore.ts")).useAuthStore.getState().user?.id), TEST_USER_ID);
      await page.reload({ waitUntil: "networkidle" });
      assert.equal(await page.evaluate(async () => (await import("/src/store/useAuthStore.ts")).useAuthStore.getState().user?.id), TEST_USER_ID);
    } else {
      await page.getByText("OAuth code exchange failed in test", { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem("dealvue-login-return")).path), destination);
    }
    assert.equal(exchanges, 1, "the SDK alone exchanges the one-use code, including StrictMode");
    await context.close();
  }
  console.log("PASS PKCE success/failure, one code exchange in StrictMode, login return, and persisted session");

  const { context, page } = await fixture();
  await page.goto(base + "/auth/callback");
  await page.getByText("로그인 결과를 확인할 수 없습니다. 로그인을 시작한 브라우저와 주소에서 다시 시도해 주세요.", { exact: true }).waitFor();
  await context.close();
  assert.deepEqual(errors, []);
  console.log("PASS incomplete callback reports missing login context; no browser exceptions");
} finally { await browser.close(); }
