import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const env = Object.fromEntries((await readFile(".env", "utf8")).split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  return match ? [[match[1], match[2].trim().replace(/^['"]|['"]$/g, "")]] : [];
}));
const catalog = JSON.parse(await readFile("src/data/provided-catalog.json", "utf8"));
const headers = { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` };
async function read(table, query) {
  const url = new URL(`${env.VITE_SUPABASE_URL}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  const data = await response.json();
  if (!response.ok) throw new Error(`${table}: HTTP ${response.status} ${data.code ?? ""} ${data.message ?? ""}`);
  return data;
}
const [businesses, templates] = await Promise.all([
  read("businesses", { source_key: "like.provided:%", select: "*,services(*),staff(id,name,position),business_category(category),business_images(img_url)", order: "id" }),
  read("provided_deal_templates", { select: "*", order: "source_key" }),
]);
assert.equal(businesses.length, 15, "imported business count");
assert.equal(templates.length, 75, "imported deal template count");
let serviceCount = 0, representativeCount = 0, reviewCount = 0, reviewImageCount = 0;
const summary = [];
for (const expected of catalog.businesses) {
  const actual = businesses.find((business) => business.source_key === expected.source_key);
  assert.ok(actual, expected.source_key);
  for (const key of ["name", "address", "number", "description", "latitude", "longitude"]) assert.equal(actual[key], expected[key], `${expected.name} ${key}`);
  assert.deepEqual(actual.source_details, expected.source_details, `${expected.name} operating details and reviews`);
  assert.ok(actual.business_category.some((item) => item.category === expected.category), `${expected.name} category`);
  assert.deepEqual(actual.business_images.map((image) => image.img_url).sort(), [...expected.images].sort(), `${expected.name} representative photos`);
  assert.equal(actual.services.length, 5, `${expected.name} services`);
  for (const menu of expected.services) {
    const service = actual.services.find((row) => row.source_key === menu.source_key);
    assert.ok(service, menu.source_key);
    for (const key of ["name", "description", "price", "duration_minutes", "display_duration_minutes"]) assert.equal(service[key], menu[key], `${expected.name} ${menu.name} ${key}`);
    const template = templates.find((row) => row.source_key === menu.source_key);
    assert.ok(template, menu.source_key);
    assert.equal(template.business_id, actual.id);
    assert.equal(template.service_id, service.id);
    assert.equal(template.original_price, menu.deal.original_price);
    assert.equal(template.deal_price, menu.deal.deal_price);
    assert.equal(template.remaining_capacity, menu.deal.capacity);
    assert.deepEqual(template.source_details, menu.deal);
  }
  serviceCount += actual.services.length;
  representativeCount += actual.business_images.length;
  reviewCount += actual.source_details.review_samples.length;
  reviewImageCount += actual.source_details.review_images.length;
  summary.push({ id: actual.id, source_key: actual.source_key, name: actual.name, category: expected.category, services: actual.services.length, representatives: actual.business_images.length, reviews: actual.source_details.review_samples.length, reviewImages: actual.source_details.review_images.length });
}
const result = { verifiedAt: new Date().toISOString(), businesses: businesses.length, services: serviceCount, templates: templates.length, representativePhotos: representativeCount, sampleReviews: reviewCount, reviewPhotos: reviewImageCount, details: summary };
await writeFile("node_modules/.tmp/audit-2026-10-15/live-import-verification.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
console.log("PASS exact comparison with supplied catalog through the app's public API; GET requests only");
