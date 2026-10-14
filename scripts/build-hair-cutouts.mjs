// Splits each 3×2 hair atlas into one WebP per hairstyle (public/images/playground/hair/{view}-{id}.webp).
// The atlas art spills across cell edges and neighbouring styles touch, so a plain cell crop cuts hair off.
// Instead each pair of neighbours is separated along the emptiest seam near their shared edge, and every
// cutout keeps a transparent margin so overflowing hair survives. Uses Chromium's canvas through Playwright:
//   DEALVUE_PLAYWRIGHT_MODULE=… node scripts/build-hair-cutouts.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { chromium } = await import(process.env.DEALVUE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href : "playwright");

const ids = ["bob", "waves", "twintails", "braids", "bun", "pixie"];
// Keep in sync with HAIR_CUTOUT in playground/appearance.ts.
const margin = { x: 100, y: 80 }, window = 70;
const atlases = [["front", "public/images/playground/avatar-hair-atlas.png"], ...["side", "back", "front-quarter", "back-quarter"].map(view => [view, `assets/turn-views/avatar-hair-atlas-${view}.png`])];
await mkdir("public/images/playground/hair", { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const [view, file] of atlases) {
    // Clean per-style art (assets/hair/{view}-{id}.png, one style per 618×787 canvas — see docs/avatar-turn-views.md)
    // replaces the atlas cut for that style.
    const separate = {};
    for (const id of ids) { try { separate[id] = await readFile(`assets/hair/${view}-${id}.png`); } catch { /* cut from the atlas */ } }
    for (const [id, art] of Object.entries(separate)) {
      const webp = await page.evaluate(async ({ data, w, h }) => {
        const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
        const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h; canvas.getContext("2d").drawImage(image, 0, 0, w, h);
        const bytes = new Uint8Array(await (await new Promise(resolve => canvas.toBlob(resolve, "image/webp", .9))).arrayBuffer());
        let binary = ""; for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
        return btoa(binary);
      }, { data: art.toString("base64"), w: 418 + margin.x * 2, h: 627 + margin.y * 2 });
      await writeFile(`public/images/playground/hair/${view}-${id}.webp`, Buffer.from(webp, "base64"));
    }
    if (Object.keys(separate).length === ids.length) { console.log(`${view}: 6 separate hairstyles`); continue; }
    let png; try { png = await readFile(file); } catch { console.log(`skip ${view}: ${file} missing`); continue; }
    const cutouts = await page.evaluate(async ({ data, margin, window }) => {
      const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext("2d"); ctx.drawImage(image, 0, 0);
      const { width, height } = canvas, pixels = ctx.getImageData(0, 0, width, height).data, cellW = width / 3, cellH = height / 2;
      const alpha = (x, y) => pixels[(y * width + x) * 4 + 3];
      // Minimum-alpha path crossing the image, allowed to drift one pixel per step, within ±window of the edge.
      const seam = (edge, length, across) => {
        const lo = Math.max(0, Math.round(edge - window)), hi = Math.min(across - 1, Math.round(edge + window)), span = hi - lo + 1;
        const cost = new Float64Array(length * span), from = new Int16Array(length * span);
        for (let t = 0; t < length; t++) for (let k = 0; k < span; k++) {
          const own = (across === width ? alpha(lo + k, t) : alpha(t, lo + k)) + Math.abs(lo + k - edge) * .05;
          if (!t) { cost[k] = own; continue; }
          let best = Infinity, arg = 0;
          for (const d of [-1, 0, 1]) { const j = k + d; if (j >= 0 && j < span && cost[(t - 1) * span + j] < best) { best = cost[(t - 1) * span + j]; arg = j; } }
          cost[t * span + k] = best + own; from[t * span + k] = arg;
        }
        const path = new Int32Array(length); let k = 0;
        for (let j = 1; j < span; j++) if (cost[(length - 1) * span + j] < cost[(length - 1) * span + k]) k = j;
        for (let t = length - 1; t >= 0; t--) { path[t] = lo + k; k = from[t * span + k]; }
        return path;
      };
      const columns = [new Int32Array(height), seam(cellW, height, width), seam(cellW * 2, height, width), new Int32Array(height).fill(width)];
      const rows = [new Int32Array(width), seam(cellH, width, height), new Int32Array(width).fill(height)];
      const out = [];
      for (let cell = 0; cell < 6; cell++) {
        const col = cell % 3, row = Math.floor(cell / 3), originX = Math.round(col * cellW) - margin.x, originY = Math.round(row * cellH) - margin.y;
        const piece = document.createElement("canvas"); piece.width = Math.round(cellW) + margin.x * 2; piece.height = Math.round(cellH) + margin.y * 2;
        const target = piece.getContext("2d").createImageData(piece.width, piece.height);
        for (let y = 0; y < piece.height; y++) for (let x = 0; x < piece.width; x++) {
          const sx = originX + x, sy = originY + y;
          if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
          if (sx < columns[col][sy] || sx >= columns[col + 1][sy] || sy < rows[row][sx] || sy >= rows[row + 1][sx]) continue;
          const from = (sy * width + sx) * 4, to = (y * piece.width + x) * 4;
          for (let c = 0; c < 4; c++) target.data[to + c] = pixels[from + c];
        }
        // Where a neighbour overlapped this style, the seam cut through its outer hair. Hairstyles are near-symmetric
        // around the crown, so on rows where one side was cut and the other wasn't, rebuild a band along the cut side
        // from the mirrored intact side (feathered into the original).
        const own = (x, y) => target.data[(y * piece.width + x) * 4 + 3];
        let sum = 0, count = 0;
        for (let y = 0; y < piece.height && count < 4000; y++) for (let x = 0; x < piece.width; x++) if (own(x, y) > 128) { sum += x; count++; }
        const axis = sum / count, spread = 18;
        const cutAt = side => { // per row, how much hair the seam on this side cut through (max over ±spread rows)
          const raw = new Float32Array(piece.height), out = new Float32Array(piece.height);
          if ((side < 0 && col === 0) || (side > 0 && col === 2)) return out;
          for (let y = 0; y < piece.height; y++) {
            const sy = originY + y; if (sy < 0 || sy >= height) continue;
            const sx = side < 0 ? columns[col][sy] : columns[col + 1][sy] - 1;
            for (let d = -4; d <= 4; d++) if (sx + d >= 0 && sx + d < width) raw[y] = Math.max(raw[y], alpha(sx + d, sy));
          }
          for (let y = 0; y < piece.height; y++) for (let d = -spread; d <= spread; d++) if (y + d >= 0 && y + d < piece.height) out[y] = Math.max(out[y], raw[y + d]);
          return out;
        };
        // Smooth weights: per row (blurred cut flags) × per column (0 near the face, 1 toward the outer hair).
        const cutLeft = cutAt(-1), cutRight = cutAt(1), smooth = flags => {
          const out = new Float32Array(piece.height), radius = 26;
          for (let y = 0; y < piece.height; y++) { let total = 0, n = 0; for (let d = -radius; d <= radius; d++) { const r = y + d; if (r >= 0 && r < piece.height) { total += flags[r]; n++; } } out[y] = total / n; }
          return out;
        };
        // Per row, how far the hair reaches from the crown on each side; a cut side reaches noticeably less far.
        const reachLeft = new Float32Array(piece.height), reachRight = new Float32Array(piece.height);
        for (let y = 0; y < piece.height; y++) for (let x = 0; x < piece.width; x++) if (own(x, y) > 100) { reachLeft[y] = Math.max(reachLeft[y], axis - x); reachRight[y] = Math.max(reachRight[y], x - axis); }
        // Rebuild a side only where it was cut and clearly reaches less far than the other side.
        const worse = (cut, other, reach, otherReach) => cut.map((v, y) => v > 60 && otherReach[y] - reach[y] > 12 ? 1 : 0);
        const onlyLeft = smooth(worse(cutLeft, cutRight, reachLeft, reachRight)), onlyRight = smooth(worse(cutRight, cutLeft, reachRight, reachLeft));
        const inner = 95, outer = 150, step = d => { const t = Math.min(1, Math.max(0, (d - inner) / (outer - inner))); return t * t * (3 - 2 * t); };
        const mirrored = new Uint8ClampedArray(target.data);
        for (let y = 0; y < piece.height; y++) for (let x = 0; x < piece.width; x++) {
          const left = x < axis, w = (left ? onlyLeft[y] : onlyRight[y]) * step(Math.abs(x - axis)), mx = Math.round(2 * axis - x);
          if (w <= 0 || mx < 0 || mx >= piece.width) continue;
          const at = (y * piece.width + x) * 4, from = (y * piece.width + mx) * 4;
          const a0 = target.data[at + 3] / 255, a1 = target.data[from + 3] / 255, a = a0 * (1 - w) + a1 * w;
          for (let c = 0; c < 3; c++) mirrored[at + c] = a ? (target.data[at + c] * a0 * (1 - w) + target.data[from + c] * a1 * w) / a : 0;
          mirrored[at + 3] = a * 255;
        }
        target.data.set(mirrored);
        piece.getContext("2d").putImageData(target, 0, 0);
        const blob = await new Promise(resolve => piece.toBlob(resolve, "image/webp", .9));
        const bytes = new Uint8Array(await blob.arrayBuffer()); let binary = "";
        for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
        out.push(btoa(binary));
      }
      return out;
    }, { data: png.toString("base64"), margin, window });
    for (const [i, base64] of cutouts.entries()) if (!separate[ids[i]]) await writeFile(`public/images/playground/hair/${view}-${ids[i]}.webp`, Buffer.from(base64, "base64"));
    console.log(`${view}: ${cutouts.length} hairstyles`);
  }
} finally { await browser.close(); }
