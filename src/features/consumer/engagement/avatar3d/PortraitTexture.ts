const resources = new Map<string, Promise<string>>();
function inlineImage(url: string) {
  if (url.startsWith("data:")) return Promise.resolve(url);
  if (!resources.has(url)) resources.set(url, fetch(url).then(response => {
    if (!response.ok) throw Error("portrait image unavailable");
    return response.blob();
  }).then(blob => new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob);
  })));
  return resources.get(url)!;
}

/** Rasterize the existing avatar itself: face, atlas clothing and selected accessories. */
export async function capturePortrait(element: HTMLElement, signal?: AbortSignal) {
  // The parent opens its dialog after child effects; wait for that layout before measuring.
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  signal?.throwIfAborted();
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) throw Error("portrait has no layout");
  async function clone(node: Element, root = false): Promise<Element | null> {
    signal?.throwIfAborted();
    const computed = getComputedStyle(node);
    if (!root && (computed.display === "none" || computed.visibility === "hidden" || computed.opacity === "0")) return null;
    const copy = node.cloneNode(false) as HTMLElement;
    const declarations: string[] = [];
    for (const property of computed) {
      if (property.startsWith("animation") || property.startsWith("transition")) continue;
      let value = computed.getPropertyValue(property);
      if (property === "background-image") {
        const urls = [...value.matchAll(/url\(["']?([^"')]+)["']?\)/g)];
        for (const match of urls) value = value.replace(match[0], `url("${await inlineImage(match[1])}")`);
      }
      value = value.replace(/url\(["']?[^"')]*#([^"')]+)["']?\)/g, "url(#$1)");
      declarations.push(`${property}:${value}`);
    }
    copy.setAttribute("style", declarations.join(";") + ";animation:none!important;transition:none!important");
    if (root) { copy.style.margin = "0"; copy.style.width = `${rect.width}px`; copy.style.height = `${rect.height}px`; copy.style.opacity = "1"; copy.style.visibility = "visible"; }
    if (copy.tagName.toLowerCase() === "img") copy.setAttribute("src", await inlineImage((node as HTMLImageElement).currentSrc));
    if (copy.tagName.toLowerCase() === "image") {
      const href = node.getAttribute("href") ?? node.getAttribute("xlink:href");
      if (href) { copy.removeAttribute("xlink:href"); copy.setAttribute("href", await inlineImage(href)); }
    }
    for (const child of node.children) { const next = await clone(child); if (next) copy.appendChild(next); }
    return copy;
  }
  const copy = await clone(element, true);
  signal?.throwIfAborted();
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "512"); svg.setAttribute("height", "768"); svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
  const foreign = document.createElementNS(svg.namespaceURI, "foreignObject");
  foreign.setAttribute("width", String(rect.width)); foreign.setAttribute("height", String(rect.height)); foreign.appendChild(copy!); svg.appendChild(foreign);
  const image = new Image(); image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`; await image.decode();
  signal?.throwIfAborted();
  const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 768;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!; ctx.drawImage(image, 0, 0); ctx.getImageData(0, 0, 1, 1);
  return canvas;
}
