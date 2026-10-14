import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export type DollMotion = "idle" | "wave" | "dance" | "pose";
export type DollView = "front" | "side" | "back";
export type DollPalette = "vanilla" | "rose" | "sky";
export interface DollScene {
  motion: (name: DollMotion) => void;
  view: (name: DollView) => void;
  palette: (name: DollPalette) => void;
  pause: (paused: boolean) => void;
  dispose: () => void;
}

const palettes = {
  vanilla: { dress: 0xf7e3cc, bow: 0x75442b },
  rose: { dress: 0xe8acc0, bow: 0x8c3b60 },
  sky: { dress: 0x99c4d7, bow: 0x4c738f },
};

function disposeModel(root: THREE.Object3D) {
  const geometry = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  root.traverse(node => {
    if (node instanceof THREE.Mesh) {
      geometry.add(node.geometry);
      for (const m of Array.isArray(node.material) ? node.material : [node.material]) materials.add(m);
    }
    if (node instanceof THREE.SkinnedMesh) node.skeleton.dispose();
  });
  geometry.forEach(g => g.dispose());
  materials.forEach(m => {
    for (const value of Object.values(m)) if (value instanceof THREE.Texture) textures.add(value);
    m.dispose();
  });
  textures.forEach(texture => {
    texture.dispose();
    if (typeof ImageBitmap !== "undefined" && texture.image instanceof ImageBitmap) texture.image.close();
  });
}

export function createDollScene(host: HTMLDivElement, ready: () => void, failed: (message: string) => void): DollScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power", preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.03;
  renderer.domElement.setAttribute("aria-label", "드래그해서 돌려보는 3D 아바타");
  renderer.domElement.setAttribute("role", "img");
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, .1, 30);
  camera.position.set(0, 2.13, 7);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.46, 0);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = true;
  controls.dampingFactor = .12;
  controls.minPolarAngle = Math.PI * .38;
  controls.maxPolarAngle = Math.PI * .56;
  controls.rotateSpeed = .55;
  controls.update();
  controls.saveState();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  scene.environmentIntensity = .62;
  room.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xfff5eb, 0xcbbacb, .85));
  const key = new THREE.DirectionalLight(0xffeedc, 2.2);
  key.position.set(-3, 6, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xf0e6ff, .9);
  fill.position.set(3, 3, -2);
  scene.add(fill);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(.78, .84, .1, 64), new THREE.MeshStandardMaterial({ color: 0xfdf3eb, roughness: .72 }));
  pedestal.position.y = .035;
  pedestal.receiveShadow = true;
  scene.add(pedestal);
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext("2d")!;
  const gradient = shadowContext.createRadialGradient(64, 64, 6, 64, 64, 64);
  gradient.addColorStop(0, "rgba(105,66,45,.23)");
  gradient.addColorStop(.5, "rgba(105,66,45,.10)");
  gradient.addColorStop(1, "rgba(105,66,45,0)");
  shadowContext.fillStyle = gradient;
  shadowContext.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.0), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = .087;
  ground.receiveShadow = true;
  scene.add(ground);
  let stopped = false, paused = false, visible = true, contextLost = false;
  let model: THREE.Object3D | undefined, mixer: THREE.AnimationMixer | undefined;
  let active: THREE.AnimationAction | undefined, idle: THREE.AnimationAction | undefined;
  let pending: DollMotion = "idle", selectedPalette: DollPalette = "vanilla";
  const actions = new Map<DollMotion, THREE.AnimationAction>();
  let frame = 0, previous = 0, elapsed = 0, viewTween = false;
  let targetAngle = 0, currentAngle = 0;
  const turntable = new THREE.Group();
  scene.add(turntable);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const cloth = new Set<THREE.MeshStandardMaterial>(), bows = new Set<THREE.MeshStandardMaterial>();
  const eyelids: THREE.Mesh[] = [];
  const applyPalette = () => {
    cloth.forEach(m => m.color.setHex(palettes[selectedPalette].dress));
    bows.forEach(m => m.color.setHex(palettes[selectedPalette].bow));
    invalidate();
  };
  const switchMotion = (name: DollMotion) => {
    pending = name;
    const next = actions.get(name);
    if (!next || !mixer) return;
    actions.forEach(action => { if (action !== active && action !== next) action.stop(); });
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
    next.clampWhenFinished = name !== "idle";
    next.setLoop(name === "idle" ? THREE.LoopRepeat : THREE.LoopOnce, name === "idle" ? Infinity : 1);
    if (reduced.matches) {
      actions.forEach(action => action.stop());
      next.play();
      next.time = name === "idle" ? 0 : next.getClip().duration * .43;
      mixer.update(0);
    } else {
      next.play();
      if (active && next !== active) next.crossFadeFrom(active, .38, false);
    }
    active = next;
    invalidate();
  };
  const finishMotion = (event: { action: THREE.AnimationAction }) => {
    if (event.action === active && idle && !reduced.matches) switchMotion("idle");
  };
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height || stopped) return;
    const aspect = width / height;
    const halfHeight = Math.max(1.57, 1.04 / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    invalidate();
  }
  function render(time: number) {
    frame = 0;
    if (stopped || contextLost || !visible || document.hidden) { previous = 0; return; }
    const delta = previous ? Math.min((time - previous) / 1000, .1) : 0;
    previous = time;
    if (!paused && !reduced.matches) {
      elapsed += delta;
      mixer?.update(delta);
      const blinkTime = elapsed % 5.4;
      const blink = blinkTime > 4.65 && blinkTime < 4.91 ? Math.sin((blinkTime - 4.65) / .26 * Math.PI) ** 1.5 : 0;
      for (const lid of eyelids) if (lid.morphTargetInfluences) lid.morphTargetInfluences[0] = blink;
    }
    if (viewTween && model) {
      currentAngle = THREE.MathUtils.damp(currentAngle, targetAngle, 9, delta || 1 / 60);
      if (reduced.matches || Math.abs(currentAngle - targetAngle) < .001) { currentAngle = targetAngle; viewTween = false; }
      turntable.rotation.y = currentAngle;
    }
    controls.update();
    renderer.render(scene, camera);
    // Keep a small diagnostic on the canvas, with no user/account state attached.
    renderer.domElement.dataset.motion = active?.getClip().name ?? "loading";
    renderer.domElement.dataset.time = elapsed.toFixed(3);
    renderer.domElement.dataset.frame = String(renderer.info.render.frame);
    renderer.domElement.dataset.angle = turntable.rotation.y.toFixed(3);
    if ((!paused && !reduced.matches && mixer) || viewTween) invalidate();
    else previous = 0;
  }
  function invalidate() {
    if (!frame && !stopped && !contextLost && visible && !document.hidden) frame = requestAnimationFrame(render);
  }
  const onVisibility = () => { previous = 0; if (!document.hidden) invalidate(); else { cancelAnimationFrame(frame); frame = 0; } };
  const onPreference = () => {
    for (const lid of eyelids) if (lid.morphTargetInfluences) lid.morphTargetInfluences[0] = 0;
    switchMotion(pending);
  };
  const onLost = (event: Event) => { event.preventDefault(); contextLost = true; cancelAnimationFrame(frame); frame = 0; failed("3D 화면이 잠시 멈췄어요. 다시 불러오면 이어서 볼 수 있어요."); };
  const startInteraction = () => { viewTween = false; };
  controls.addEventListener("change", invalidate);
  controls.addEventListener("start", startInteraction);
  document.addEventListener("visibilitychange", onVisibility);
  reduced.addEventListener("change", onPreference);
  renderer.domElement.addEventListener("webglcontextlost", onLost);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const intersection = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? true;
    previous = 0;
    if (visible) invalidate(); else { cancelAnimationFrame(frame); frame = 0; }
  });
  intersection.observe(host);
  resize();
  const controller = new AbortController();
  const loadTimeout = window.setTimeout(() => controller.abort(), 60000);
  fetch("/models/avatar-prototype/avatar.glb", { signal: controller.signal })
    .then(response => { if (!response.ok) throw new Error("model unavailable"); return response.arrayBuffer(); })
    .then(bytes => new GLTFLoader().parseAsync(bytes, "/models/avatar-prototype/"))
    .then(gltf => {
      window.clearTimeout(loadTimeout);
      if (stopped) { disposeModel(gltf.scene); return; }
      model = gltf.scene;
      turntable.add(model);
      model.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return;
        if (node.morphTargetDictionary?.blink === 0 && node.morphTargetInfluences) eyelids.push(node);
        node.castShadow = true;
        for (const mat of Array.isArray(node.material) ? node.material : [node.material]) {
          if (!(mat instanceof THREE.MeshStandardMaterial)) continue;
          if (mat.name === "Vanilla dress") cloth.add(mat);
          if (mat.name === "Cafe ribbon") bows.add(mat);
        }
        // Skin deforms outside its rest-pose bounds during a raised-hand gesture.
        if (node instanceof THREE.SkinnedMesh) node.frustumCulled = false;
      });
      mixer = new THREE.AnimationMixer(model);
      for (const clip of gltf.animations) if (["idle", "wave", "dance", "pose"].includes(clip.name)) actions.set(clip.name as DollMotion, mixer.clipAction(clip));
      if (actions.size !== 4) throw new Error("animation clips missing");
      idle = actions.get("idle");
      mixer.addEventListener("finished", finishMotion);
      switchMotion(pending);
      applyPalette();
      renderer.domElement.dataset.ready = "true";
      ready();
    })
    .catch(() => { window.clearTimeout(loadTimeout); if (!stopped) failed("아바타를 불러오지 못했어요. 다시 시도해 주세요."); });
  return {
    motion: switchMotion,
    palette(name) { selectedPalette = name; applyPalette(); },
    view(name) {
      controls.reset();
      targetAngle = name === "front" ? 0 : name === "side" ? -Math.PI / 2 : Math.PI;
      viewTween = true;
      invalidate();
    },
    pause(value) { paused = value; previous = 0; invalidate(); },
    dispose() {
      stopped = true;
      controller.abort();
      window.clearTimeout(loadTimeout);
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", onPreference);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      controls.removeEventListener("change", invalidate);
      controls.removeEventListener("start", startInteraction);
      controls.dispose();
      if (mixer) {
        mixer.removeEventListener("finished", finishMotion);
        mixer.stopAllAction();
        if (model) mixer.uncacheRoot(model);
      }
      disposeModel(scene);
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
