import { cloneElement, useEffect, useRef, useState, type ReactElement } from "react";
import { LOOKS } from "../playground/data";
import { useReducedMotion } from "../playground/motion";
import { createWardrobeScene, type WardrobeScene } from "./WardrobeScene";
import { capturePortrait } from "./PortraitTexture";
import type { ModelStyle } from "./WardrobeModel";
import { loadTurnViews, type TurnManifest, type TurnView } from "../playground/turnViews";
import DrawnTurn from "./DrawnTurn";

type Portrait = ModelStyle & { view?: TurnView };
type Props = ModelStyle & { fallback: ReactElement<Portrait> };

/** Drawn turn views when the art exists; otherwise a 3D volume synthesized from the front portrait. */
export default function WardrobeAvatar(props: Props) {
  const reduced = useReducedMotion();
  const [views, setViews] = useState<TurnManifest | null>(null);
  useEffect(() => { let alive = true; loadTurnViews().then(manifest => { if (alive) setViews(manifest); }); return () => { alive = false; }; }, []);
  const { outfit, accessories, appearance, fallback } = props;
  if (!views) return <div className="fashion-avatar wardrobe-3d-avatar status-loading"><div className="wardrobe-design-portrait">{cloneElement(fallback, { outfit, accessories, appearance })}</div></div>;
  return views.head ? <DrawnTurn {...props} views={views} reduced={reduced} /> : <VolumeTurn {...props} reduced={reduced} />;
}

function VolumeTurn({ outfit, accessories, appearance, fallback, reduced }: Props & { reduced: boolean }) {
  const host = useRef<HTMLDivElement>(null), source = useRef<HTMLDivElement>(null), scene = useRef<WardrobeScene | null>(null);
  const [presented, setPresented] = useState<ModelStyle>({ outfit, accessories, appearance });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    if (!host.current) return;
    let alive = true;
    try {
      scene.current = createWardrobeScene(host.current, style => {
        if (alive) { setPresented(style); setStatus("ready"); }
      }, () => { if (alive) setStatus("error"); });
    } catch { queueMicrotask(() => { if (alive) setStatus("error"); }); }
    return () => { alive = false; scene.current?.dispose(); scene.current = null; };
  }, []);
  useEffect(() => {
    const portrait = source.current?.firstElementChild as HTMLElement | null;
    if (!portrait) return;
    let alive = true;
    const controller = new AbortController();
    capturePortrait(portrait, controller.signal).then(image => {
      if (alive) scene.current?.prepare({ outfit, accessories, appearance }, image, reduced);
    }).catch(() => { if (alive) setStatus("error"); });
    return () => { alive = false; controller.abort(); };
  }, [outfit, accessories, appearance, reduced]);
  const shown = status === "error" ? { outfit, accessories, appearance } : presented;
  const look = LOOKS.find(item => item.id === shown.outfit)!;
  return <div className={`fashion-avatar wardrobe-3d-avatar status-${status}`} role="img" aria-label={`나의 아바타 · ${look.name}`}>
    <div className="wardrobe-3d-canvas" ref={host} />
    <div className="wardrobe-design-portrait">{cloneElement(fallback, shown)}</div>
    <div className="wardrobe-design-source" ref={source} aria-hidden="true">{fallback}</div>
  </div>;
}
