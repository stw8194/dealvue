import { cloneElement, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement } from "react";
import { LOOKS } from "../playground/data";
import { hasQuarterViews, hasTurnViews, turnFaces, turnImageSources, type TurnFace, type TurnManifest, type TurnView } from "../playground/turnViews";
import { TURN_DURATION, TURN_MAX_STEP, TURN_PHASES, twirl } from "./turnMotion";
import type { ModelStyle } from "./WardrobeModel";

type Portrait = ModelStyle & { view?: TurnView };
const decoded = new Map<string, Promise<void>>();
function decode(url: string) {
  if (!decoded.has(url)) { const image = new Image(); image.src = url; decoded.set(url, image.decode().catch(() => undefined)); }
  return decoded.get(url)!;
}

/**
 * Spins through the drawn turn views as plain layered DOM: no rasterizing and no WebGL, only opacity and transform
 * changes per frame. The old outfit shows until its back faces the viewer, then the new one continues the turn.
 */
export default function DrawnTurn({ outfit, accessories, appearance, fallback, views, reduced }: ModelStyle & { fallback: ReactElement<Portrait>; views: TurnManifest; reduced: boolean }) {
  // Result of the last outfit turn; other changes (and every change with reduced motion) show in place without turning.
  const [settled, setSettled] = useState<ModelStyle>({ outfit, accessories, appearance });
  const [turn, setTurn] = useState<{ from: ModelStyle; to: ModelStyle; quarters: boolean } | null>(null);
  // Effects outlive the turn so the landing burst can finish; a new turn restarts them.
  const [effects, setEffects] = useState(0);
  const root = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), frames = useRef(0);
  const targetKey = JSON.stringify({ outfit, accessories, appearance });
  // Adjust during render (not in an effect) so in-place changes stay applied while a later outfit's drawings load.
  if (!turn && (reduced || outfit === settled.outfit) && JSON.stringify(settled) !== targetKey) setSettled({ outfit, accessories, appearance });
  const shown = settled, shownKey = JSON.stringify(shown);

  // Start a turn when the outfit changes. A change made mid-turn is picked up when it ends.
  useEffect(() => {
    const next = JSON.parse(targetKey) as ModelStyle, from = JSON.parse(shownKey) as ModelStyle;
    if (turn || next.outfit === from.outfit) return;
    const quarters = hasQuarterViews(views, from) && hasQuarterViews(views, next);
    const faces = [...new Set(turnFaces(quarters).map(([face]) => face))];
    let alive = true;
    // Decode every drawing first so no layer pops in half-loaded mid-spin.
    Promise.all([from, next].flatMap(style => turnImageSources(style, hasTurnViews(views, style.outfit) ? faces : ["front"])).map(decode))
      .then(() => { if (alive) { setTurn({ from, to: next, quarters }); setEffects(count => count + 1); } });
    return () => { alive = false; };
  }, [targetKey, shownKey, turn, views]);

  // Layout effect: the first pose is applied before the stage is ever painted.
  useLayoutEffect(() => {
    const host = root.current, spin = stage.current;
    if (!turn || !host || !spin) return;
    const faces = turnFaces(turn.quarters), step = Math.PI * 2 / faces.length;
    const layers = [...spin.querySelectorAll<HTMLElement>("[data-face]")];
    // Hold the first pose for two frames so every drawing is rasterized before the spin needs it.
    let frame = 0, previous = 0, elapsed = 0, swapped = false, warm = 2;
    const render = (time: number) => {
      if (warm > 0) warm--;
      else { elapsed += previous ? Math.min(time - previous, TURN_MAX_STEP) : 0; previous = time; }
      const t = Math.min(1, elapsed / TURN_DURATION), { angle, lift, squash } = twirl(t);
      const position = angle / step, index = Math.floor(position), between = position - index;
      // Faces before the back belong to the old outfit, after it to the new one; the back itself switches as it passes.
      const pick = (at: number) => {
        const [face, mirrored] = faces[((at % faces.length) + faces.length) % faces.length], faceAngle = at * step;
        return { key: `${faceAngle < Math.PI || (faceAngle === Math.PI && angle < Math.PI) ? "from" : "to"}-${face}`, mirrored };
      };
      // One drawing at a time, switching halfway between faces — no cross-fade, so no ghosting.
      const visible = pick(between < .5 ? index : index + 1);
      for (const layer of layers) {
        const on = layer.dataset.face === visible.key;
        layer.style.opacity = on ? "1" : "0";
        if (on) layer.style.transform = visible.mirrored ? "scaleX(-1)" : "";
      }
      const edge = 1 - Math.abs(between * 2 - 1), width = (1 / Math.sqrt(1 - squash)) * (1 - .2 * edge * edge);
      spin.style.transform = `translateY(${(-lift * 100).toFixed(2)}%) scale(${width.toFixed(4)}, ${(1 - squash).toFixed(4)})`;
      if (!swapped && angle >= Math.PI) swapped = true;
      const style = swapped ? turn.to : turn.from;
      Object.assign(host.dataset, { angle: angle.toFixed(4), face: `${visible.key}${visible.mirrored ? "-mirrored" : ""}`, outfit: style.outfit, frame: String(++frames.current) });
      if (t < 1) frame = requestAnimationFrame(render);
      else { setSettled(turn.to); setTurn(null); }
    };
    host.dataset.turning = "true"; render(performance.now());
    return () => { cancelAnimationFrame(frame); host.dataset.turning = "false"; host.dataset.angle = "0"; };
  }, [turn]);

  const faceSet = (set: "from" | "to", style: ModelStyle) => {
    const drawn = hasTurnViews(views, style.outfit), faces = new Set<TurnFace>(turnFaces(turn!.quarters).map(([face]) => face));
    // Outfits without drawn views flip their front drawing instead.
    return [...faces].map(face => <div key={`${set}-${face}`} className="drawn-turn-face" data-face={`${set}-${face}`}>{cloneElement(fallback, { ...style, view: face === "front" || !drawn ? undefined : face })}</div>);
  };
  const presented = turn?.to ?? shown, look = LOOKS.find(item => item.id === shown.outfit)!;
  return <div ref={root} className={`fashion-avatar wardrobe-drawn-avatar ${turn ? "is-turning" : ""}`} role="img" aria-label={`나의 아바타 · ${look.name}`}
    data-avatar-turn="drawn" data-ready="true" data-turn-views="true" data-turning="false" data-outfit={shown.outfit} data-target-outfit={presented.outfit}
    data-appearance={JSON.stringify(shown.appearance)} data-accessories={JSON.stringify(shown.accessories)}>
    <div className="wardrobe-design-portrait">{cloneElement(fallback, shown)}</div>
    {effects > 0 && <TurnEffects key={`floor-${effects}`} layer="floor" />}
    {turn && <div className="drawn-turn-stage" ref={stage} aria-hidden="true">{faceSet("from", turn.from)}{faceSet("to", turn.to)}</div>}
    {effects > 0 && <TurnEffects key={`air-${effects}`} layer="air" />}
  </div>;
}

/** Launch ring and swooshes during the spin, a sparkle burst as the outfit swaps, dust and a shock ring on landing. CSS-only. */
function TurnEffects({ layer }: { layer: "floor" | "air" }) {
  const timing = { "--turn-ms": `${TURN_DURATION}ms`, "--wind-at": TURN_PHASES.windUp, "--swap-at": TURN_PHASES.swap, "--land-at": TURN_PHASES.landing } as CSSProperties;
  // Floor rings sit behind the feet; everything else plays in front of the avatar.
  if (layer === "floor") return <div className="turn-fx" style={timing} aria-hidden="true"><span className="turn-fx-ring is-launch" /><span className="turn-fx-ring is-land" /></div>;
  return <div className="turn-fx" style={timing} aria-hidden="true">
    <svg className="turn-fx-swoosh" viewBox="0 0 100 150" preserveAspectRatio="none"><path pathLength={100} d="M8 70q42 26 84 0" /><path pathLength={100} d="M14 104q36 20 72 0" /></svg>
    <span className="turn-fx-flash" />
    {Array.from({ length: 10 }, (_, i) => <span key={i} className="turn-fx-star" style={{ "--i": i } as CSSProperties}>✦</span>)}
    <span className="turn-fx-dust is-left" /><span className="turn-fx-dust is-right" />
    {[[10, 26], [86, 18], [16, 62], [82, 54]].map(([x, y], i) => <span key={`twinkle-${i}`} className="turn-fx-twinkle" style={{ left: `${x}%`, top: `${y}%`, "--i": i } as CSSProperties}>✦</span>)}
  </div>;
}
