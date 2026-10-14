// Encodes the drawn turn-view PNGs (assets/turn-views/) as WebP for the app (public/images/playground/views/).
// Uses Chromium's encoder through Playwright, like the other browser scripts:
//   DEALVUE_PLAYWRIGHT_MODULE=… node scripts/build-turn-views-webp.mjs [quality=0.9]
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { chromium } = await import(process.env.DEALVUE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href : "playwright");
const source = "assets/turn-views", target = "public/images/playground/views", quality = Number(process.argv[2] ?? .9);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  let before = 0, after = 0;
  for (const name of (await readdir(source)).filter(file => file.endsWith(".png"))) {
    const png = await readFile(`${source}/${name}`);
    const webp = await page.evaluate(async ({ data, quality }) => {
      const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
      canvas.getContext("2d").drawImage(image, 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", quality));
      if (blob.type !== "image/webp") throw Error("this browser cannot encode WebP");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = ""; for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
      return btoa(binary);
    }, { data: png.toString("base64"), quality });
    const out = `${target}/${name.replace(/\.png$/, ".webp")}`;
    await writeFile(out, Buffer.from(webp, "base64"));
    before += png.length; after += (await stat(out)).size;
    console.log(`${name} → ${(png.length / 1e6).toFixed(2)} MB → ${((await stat(out)).size / 1e6).toFixed(2)} MB`);
  }
  console.log(`total ${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB`);
} finally { await browser.close(); }
