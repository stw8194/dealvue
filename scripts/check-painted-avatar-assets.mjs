import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { HAIR_CHOICES } from "../src/features/consumer/engagement/playground/appearance.ts";
import { ACCESSORY_DESIGNS, ACCESSORIES } from "../src/features/consumer/engagement/playground/accessoryCatalog.ts";

const artwork = JSON.parse(await readFile("src/data/avatar-art-v4.json", "utf8"));
const views = ["front", "front-quarter", "side", "back-quarter", "back"];
for (const choice of HAIR_CHOICES.filter(choice => choice.hairstyle !== "bob")) {
  const head = artwork.heads[choice.hairstyle];
  assert.ok(head, choice.id);
  assert.ok((await stat(`public${head.source}`)).size > 1000, head.source);
  assert.deepEqual(Object.keys(head.views), views);
  for (const placement of Object.values(head.views)) {
    const [a, b, c, d, e, f] = placement.matrix;
    assert.ok(placement.matrix.every(Number.isFinite));
    assert.ok(Math.abs(a - d) < 1e-6 && Math.abs(b + c) < 1e-6, "complete heads may rotate and scale uniformly, never stretch faces");
    const [left, top, right, bottom] = placement.bounds;
    assert.ok(left >= 0 && top >= 0 && right <= head.width && bottom <= head.height && right > left && bottom > top);
    if (placement.sourceEyes) {
      for (let i = 0; i < 4; i += 2) {
        const [x, y] = placement.sourceEyes.slice(i, i + 2);
        const [tx, ty] = placement.referenceEyes.slice(i, i + 2);
        assert.ok(Math.hypot(a * x + c * y + e - tx, b * x + d * y + f - ty) < .01, `${choice.id}: eyes stay at Coco's reference positions`);
      }
    }
  }
}
const atlases = { hair: "hair-accessories", ears: "earrings", bag: "bags", necklace: "necklaces" };
for (const [slot, key] of Object.entries(atlases)) {
  const atlas = artwork.accessories[key];
  const designs = ACCESSORY_DESIGNS.filter(design => design.slot === slot);
  assert.equal(atlas.crops.length, designs.length);
  assert.ok((await stat(`public${atlas.source}`)).size > 1000);
  for (const [x, y, width, height] of atlas.crops) {
    assert.ok(x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= atlas.width && y + height <= atlas.height);
  }
  for (const item of ACCESSORIES.filter(item => item.slot === slot && item.design !== "none")) assert.ok(designs.some(design => design.id === item.design), item.id);
}
assert.equal(ACCESSORY_DESIGNS.length, 48);
assert.equal(HAIR_CHOICES.length, 11);
console.log("PASS 10 alternate hair choices, 25 painted views, uniform face registration, 48 painted accessory designs and all existing colorway IDs");
