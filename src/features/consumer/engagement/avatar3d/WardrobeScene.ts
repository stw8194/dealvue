import * as THREE from "three";
import { disposeMeshes, type ModelStyle } from "./WardrobeModel";
import { createPortraitVolume } from "./PortraitVolume";
import { TURN_DURATION, TURN_MAX_STEP, twirl } from "./turnMotion";

export interface WardrobeScene { prepare: (style: ModelStyle, image: HTMLCanvasElement, reduced: boolean) => void; dispose: () => void }
type Prepared = { style: ModelStyle; model: THREE.Group };
// Canvas overhangs its host by this factor so the hop and squash never clip the silhouette.
export const STAGE_PAD = 1.12;

export function createWardrobeScene(host: HTMLDivElement, present: (style: ModelStyle) => void, failed: () => void): WardrobeScene {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power", preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement; canvas.setAttribute("aria-hidden", "true"); canvas.dataset.avatarTurn = "volume"; host.appendChild(canvas);
  const scene = new THREE.Scene(), turntable = new THREE.Group(); scene.add(turntable);
  const camera = new THREE.OrthographicCamera(-STAGE_PAD, STAGE_PAD, 1.5 * STAGE_PAD, -1.5 * STAGE_PAD, .1, 30); camera.position.set(0, 1.5, 7); camera.lookAt(0, 1.5, 0);
  let current: Prepared | null = null, pending: Prepared | null = null;
  let disposed = false, lost = false, visible = true, frame = 0, previous = 0, elapsed = 0, turning = false, swapped = false;
  const apply = (next: Prepared) => {
    if (current) { turntable.remove(current.model); disposeMeshes(current.model); }
    current = next; turntable.add(next.model);
    canvas.dataset.outfit = next.style.outfit; canvas.dataset.appearance = JSON.stringify(next.style.appearance); canvas.dataset.accessories = JSON.stringify(next.style.accessories);
    canvas.dataset.modelDepth = String(next.model.userData.depth); canvas.dataset.vertices = String(next.model.userData.vertices);
  };
  function invalidate() { if (!frame && !disposed && !lost && visible && !document.hidden) frame = requestAnimationFrame(render); }
  function pose(angle: number, lift: number, squash: number) {
    turntable.rotation.y = angle; turntable.position.y = lift * 3; // the model is 3 units tall
    const width = 1 / Math.sqrt(1 - squash); turntable.scale.set(width, 1 - squash, width);
    // Edge-on, the synthesized volume is only as wide as its depth; plump it up so the profile reads as a body.
    if (current) { const side = Math.sin(angle) ** 2; current.model.scale.z = 1 + .6 * side; current.model.userData.turnSide.value = side; }
  }
  function finish() { turning = false; pose(0, 0, 0); canvas.dataset.turning = host.dataset.turning = "false"; if (current) present(current.style); }
  function start() { turning = true; elapsed = 0; previous = 0; swapped = false; canvas.dataset.turning = host.dataset.turning = "true"; invalidate(); }
  function render(time: number) {
    frame = 0; if (disposed || lost || !visible || document.hidden) { previous = 0; return; }
    if (turning) {
      elapsed += previous ? Math.min(time - previous, TURN_MAX_STEP) : 0; previous = time;
      const t = Math.min(1, elapsed / TURN_DURATION), { angle, lift, squash } = twirl(t);
      // Swap garments while the back faces the camera.
      if (angle >= Math.PI && !swapped) { if (pending) { apply(pending); pending = null; } swapped = true; }
      pose(angle, lift, squash);
      if (t === 1) { finish(); if (pending) start(); }
    }
    renderer.render(scene, camera); canvas.dataset.angle = turntable.rotation.y.toFixed(4); canvas.dataset.frame = String(renderer.info.render.frame);
    if (turning) invalidate();
  }
  function resize() { const rect = host.getBoundingClientRect(); if (!rect.width || !rect.height || disposed) return; renderer.setSize(rect.width * STAGE_PAD, rect.height * STAGE_PAD, false); invalidate(); }
  const visibility = () => { previous = 0; if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else invalidate(); };
  const onLost = (event: Event) => { event.preventDefault(); lost = true; cancelAnimationFrame(frame); frame = 0; failed(); };
  document.addEventListener("visibilitychange", visibility); canvas.addEventListener("webglcontextlost", onLost);
  const observer = new ResizeObserver(resize); observer.observe(host);
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; previous = 0; if (visible) invalidate(); else { cancelAnimationFrame(frame); frame = 0; } }); intersection.observe(host); resize();
  return {
    prepare(style, image, reduced) {
      if (disposed || lost) return;
      const next = { style, model: createPortraitVolume(image) }; canvas.dataset.targetOutfit = style.outfit;
      if (!current || reduced || (!turning && current.style.outfit === style.outfit)) {
        if (pending) { disposeMeshes(pending.model); pending = null; }
        apply(next); finish(); canvas.dataset.ready = "true"; invalidate();
      } else {
        if (pending) disposeMeshes(pending.model); pending = next;
        if (!turning) start();
      }
    },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); document.removeEventListener("visibilitychange", visibility); canvas.removeEventListener("webglcontextlost", onLost);
      disposeMeshes(scene); if (pending) disposeMeshes(pending.model); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); delete host.dataset.turning;
    },
  };
}
