import * as THREE from "three";
import { ACCESSORIES, LOOKS, type Accessories, type Outfit } from "../playground/data";
import { EYE_COLORS, FACE_TONES, HAIR_COLORS, type AvatarAppearance } from "../playground/appearance";

export type ModelStyle = { outfit: Outfit; accessories: Accessories; appearance: AvatarAppearance };
const y = (z: number) => .09 + (z - .09) * .78;

export function disposeMeshes(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  root.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    geometries.add(node.geometry);
    for (const mat of Array.isArray(node.material) ? node.material : [node.material]) materials.add(mat);
  });
  geometries.forEach(item => item.dispose());
  materials.forEach(mat => {
    for (const value of Object.values(mat)) if (value instanceof THREE.Texture) textures.add(value);
    mat.dispose();
  });
  textures.forEach(texture => { texture.dispose(); if (typeof ImageBitmap !== "undefined" && texture.image instanceof ImageBitmap) texture.image.close(); });
}

function material(color: string, roughness = .78) { return new THREE.MeshStandardMaterial({ color, roughness }); }
function ball(group: THREE.Group, mat: THREE.Material, pos: number[], scale: number[]) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat);
  mesh.position.set(pos[0], pos[1], pos[2]); mesh.scale.set(scale[0], scale[1], scale[2]); group.add(mesh); return mesh;
}
function line(group: THREE.Group, mat: THREE.Material, points: number[][], width: number) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, width, 8, false), mat); group.add(mesh); return mesh;
}
function bow(group: THREE.Group, mat: THREE.Material, x: number, height: number, z: number, size = 1) {
  for (const sign of [-1, 1]) {
    const loop = ball(group, mat, [x + sign * .075 * size, height, z], [.075 * size, .038 * size, .025 * size]); loop.rotation.z = sign * .3;
    line(group, mat, [[x + sign * .02 * size, height, z], [x + sign * .04 * size, height - .07 * size, z], [x + sign * .06 * size, height - .1 * size, z]], .013 * size);
  }
  ball(group, mat, [x, height, z - .012], [.023 * size, .025 * size, .027 * size]);
}
function skirt(group: THREE.Group, mat: THREE.Material, top: number, bottom: number, radius: number, folds = 16) {
  // Closed elliptical volume with radial pleats, including an underside and back.
  const points = [new THREE.Vector2(.22, bottom), new THREE.Vector2(radius, bottom), new THREE.Vector2(radius * .98, bottom + .03), new THREE.Vector2(.32 + (radius - .32) * .6, (top + bottom) / 2), new THREE.Vector2(.3, top), new THREE.Vector2(.285, top), new THREE.Vector2(.22, bottom)];
  const geometry = new THREE.LatheGeometry(points, 96);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i), t = (top - positions.getY(i)) / (top - bottom);
    const wave = 1 + .024 * Math.cos(Math.atan2(x, z) * folds) * t;
    positions.setXYZ(i, x * wave, positions.getY(i), z * .68 * wave);
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, mat); group.add(mesh); return mesh;
}
function pattern(color: string, accent: string, kind: "check" | "knit" | "flower") {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color; ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = accent;
  if (kind === "check") {
    ctx.globalAlpha = .25;
    for (let i = 0; i < 128; i += 32) { ctx.fillRect(i, 0, 16, 128); ctx.fillRect(0, i, 128, 16); }
  } else if (kind === "knit") {
    ctx.strokeStyle = accent; ctx.globalAlpha = .16; ctx.lineWidth = 1.2;
    for (let i = 0; i < 128; i += 8) for (let j = 0; j < 128; j += 8) { ctx.beginPath(); ctx.moveTo(i, j); ctx.lineTo(i + 4, j + 5); ctx.lineTo(i + 8, j); ctx.stroke(); }
  } else {
    ctx.globalAlpha = .45;
    for (let i = 16; i < 128; i += 32) for (let j = 16; j < 128; j += 32) for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.ellipse(i + Math.sin(p * 1.257) * 3, j + Math.cos(p * 1.257) * 3, 2, 3, p * 1.257, 0, Math.PI * 2); ctx.fill(); }
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(2, 2); return texture;
}

export function createClothes(outfit: Outfit) {
  const look = LOOKS.find(item => item.id === outfit)!;
  const group = new THREE.Group(); group.name = `outfit-${outfit}`;
  const cloth = material(look.color), trim = material(look.accent), cream = material("#fff3df"), shoe = material(["basic", "cafe", "maple", "teddy"].includes(outfit) ? "#895a40" : look.accent, .57);
  const tailored = ["basic", "cream", "pistachio", "varsity"].includes(outfit);
  const pants = ["explorer", "rockstar"].includes(outfit);
  const coat = ["raincoat", "snow", "maple", "picnic-cape"].includes(outfit);
  const ballet = ["pink", "peach-tutu"].includes(outfit);
  const apron = ["cafe", "alice", "patisserie"].includes(outfit);
  const check = ["cafe", "strawberry", "mint", "maple"].includes(outfit);
  if (check || tailored || ["violet-tea", "blossom", "rose-tea", "sunflower"].includes(outfit)) {
    cloth.color.set("white"); cloth.map = pattern(look.color, look.accent, check ? "check" : tailored ? "knit" : "flower");
  }
  ball(group, cloth, [0, y(1.58), 0], [.308, .25, .19]);
  const long = ["princess", "hanbok", "moon", "mermaid"].includes(outfit);
  const skirtBottom = y(long ? .59 : .89);
  if (pants) {
    for (const sign of [-1, 1]) ball(group, trim, [sign * .15, y(.79), 0], [.126, .27, .11]);
    if (outfit === "explorer") {
      ball(group, trim, [0, y(1.57), -.179], [.18, .18, .025]);
      for (const sign of [-1, 1]) line(group, trim, [[sign * .16, y(1.84), -.1], [sign * .13, y(1.58), -.21], [sign * .15, y(1.37), -.19]], .022);
    }
  } else {
    skirt(group, cloth, y(outfit === "hanbok" ? 1.68 : 1.42), skirtBottom, long ? .6 : .52);
    if (ballet || ["lilac", "fairy", "tropical", "holiday", "princess", "rose-tea", "violet-tea"].includes(outfit)) {
      for (let i = 0; i < (ballet ? 3 : 2); i++) skirt(group, i % 2 ? cream : cloth, y(1.22 - i * .14), y(.9 - i * .055), .54 + i * .024, 24);
    }
    if (tailored || outfit === "sailor" || outfit === "denim") {
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; line(group, trim, [[.305 * Math.sin(a), y(1.4), .21 * Math.cos(a)], [.52 * Math.sin(a), skirtBottom, .355 * Math.cos(a)]], .004); }
    }
  }
  for (const sign of [-1, 1]) {
    const sleeve = ball(group, cloth, [sign * .335, y(1.7), 0], [tailored ? .115 : .15, tailored || coat ? .16 : .12, .145]); sleeve.rotation.z = sign * .4;
    if (coat || tailored || outfit === "bunny-hoodie" || outfit === "teddy") {
      const lower = ball(group, cloth, [sign * .43, y(1.47), -.015], [.103, .18, .105]); lower.rotation.z = sign * .48;
    }
    ball(group, cream, [sign * .16, y(.49), 0], [.09, .16, .092]);
    ball(group, shoe, [sign * .16, y(.2), -.075], [.127, .09, .19]);
    ball(group, trim, [sign * .16, y(.105), -.065], [.132, .022, .198]);
    if (ballet) bow(group, cloth, sign * .16, y(.28), -.22, .45);
  }
  // A complete waist sash and bow tie remain visible from the rear.
  skirt(group, trim, y(1.45), y(1.39), .31, 0);
  if (coat && outfit !== "raincoat") skirt(group, cloth, y(1.84), y(1.46), .51, 12);
  if (apron) {
    // Curved extruded apron is a small solid shell over the skirt, not a portrait plane.
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, Math.PI / 2, Math.PI, 0, Math.PI), cream);
    mesh.scale.set(.4, .24, .16); mesh.position.set(0, y(1.16), -.26); group.add(mesh);
    ball(group, cream, [0, y(1.62), -.195], [.15, .16, .03]);
    for (const sign of [-1, 1]) line(group, cream, [[sign * .18, y(1.85), .08], [sign * .19, y(1.88), -.08], [sign * .17, y(1.4), -.2]], .027);
    bow(group, cream, 0, y(1.4), .24, 1.3);
  } else bow(group, trim, 0, y(1.42), .24, .85);
  if (tailored || coat) {
    for (let i = 0; i < 3; i++) ball(group, trim, [0, y(1.72 - i * .12), -.19], [.015, .016, .012]);
    line(group, trim, [[0, y(1.84), -.1], [0, y(1.56), -.2], [0, y(1.43), -.17]], .006);
    for (const sign of [-1, 1]) ball(group, cream, [sign * .105, y(1.79), -.145], [.09, .028, .048]);
  } else bow(group, trim, 0, y(outfit === "hanbok" ? 1.68 : 1.75), -.22, ballet ? 1.3 : .8);
  if (outfit === "bunny-hoodie" || outfit === "teddy") {
    const hood = ball(group, cloth, [0, y(1.79), .14], [.34, .19, .2]); hood.name = "hood";
    for (const sign of [-1, 1]) ball(group, cloth, [sign * .17, y(2), .2], [.07, outfit === "teddy" ? .07 : .17, .06]);
  }
  if (["fairy", "mermaid"].includes(outfit)) for (const sign of [-1, 1]) {
    const wing = ball(group, material("#eadcff", .4), [sign * .37, y(1.68), .24], [.22, .32, .07]); wing.rotation.z = sign * -.4;
  }
  return group;
}

export function styleHead(model: THREE.Object3D, appearance: AvatarAppearance) {
  const tone = FACE_TONES.find(item => item.id === appearance.tone)!;
  const hair = HAIR_COLORS.find(item => item.id === appearance.hairColor)!;
  const eyes = EYE_COLORS.find(item => item.id === appearance.eyeColor)!;
  model.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    const mat = node.material as THREE.MeshStandardMaterial;
    if (mat.name === "Peach porcelain") mat.color.set(tone.color);
    if (node.name.startsWith("hair-") || mat.name === "Chestnut silk" || mat.name === "Chestnut ribbons") {
      mat.color.set(appearance.hairColor === "chestnut" ? "#ffffff" : hair.color);
      if (appearance.hairColor !== "chestnut") mat.color.multiplyScalar(2);
      if (node.name.startsWith("hair-")) {
        const short = appearance.hairstyle === "pixie" || appearance.hairstyle === "bun";
        node.scale.y = short ? .72 : 1;
        node.position.y = short ? .28 * 2.78 : 0;
      }
    }
    if (mat.name === "Honey iris") mat.color.set(appearance.eyeColor === "brown" ? "#ffffff" : eyes.color);
    // Scale eye contours around their individual centers without moving the face.
    if (node.name.startsWith("eye-")) {
      const gentle = appearance.eyes === "gentle" || appearance.eyes === "cat";
      node.scale.y = gentle ? .88 : appearance.eyes === "round" ? 1.03 : 1;
      // Blender nodes have local origins; keep the eye centers anchored in world space.
      node.position.y = gentle ? .12 * 2.05 : appearance.eyes === "round" ? -.03 * 2.05 : 0;
    }
    if (node.name.startsWith("mouth-")) node.visible = appearance.mouth === "smile";
  });
}

export function createHeadDetails(appearance: AvatarAppearance) {
  const group = new THREE.Group(); group.name = "appearance-details";
  const hair = material(HAIR_COLORS.find(item => item.id === appearance.hairColor)!.color, .72);
  const mouth = material("#bb757b");
  if (appearance.hairstyle === "bun") ball(group, hair, [0, 2.76, .1], [.24, .23, .21]);
  if (["waves", "twintails", "braids"].includes(appearance.hairstyle)) for (const sign of [-1, 1]) {
    if (appearance.hairstyle === "braids") {
      for (let i = 0; i < 6; i++) ball(group, hair, [sign * (.57 + Math.sin(i * Math.PI) * .025), 2.04 - i * .092, .045], [.085 - i * .007, .065, .08]);
    } else {
      line(group, hair, [[sign * .53, 2.36, .08], [sign * .69, 2.1, .08], [sign * .64, 1.78, .07], [sign * .58, 1.5, .03]], appearance.hairstyle === "waves" ? .13 : .16);
      if (appearance.hairstyle === "twintails") bow(group, material("#e6b4c5"), sign * .63, 2.23, -.015, .7);
    }
  }
  const height = 2.29 - .5046;
  if (appearance.mouth === "grin" || appearance.mouth === "ooh") {
    ball(group, mouth, [0, height, -.47], [appearance.mouth === "grin" ? .06 : .033, .035, .015]);
    if (appearance.mouth === "grin") ball(group, material("#fff5e6"), [0, height + .012, -.482], [.044, .012, .005]);
  } else if (appearance.mouth === "pout") ball(group, mouth, [0, height, -.465], [.032, .016, .016]);
  else if (appearance.mouth === "kitty") line(group, mouth, [[-.06, height + .014, -.466], [-.03, height - .015, -.467], [0, height + .003, -.467], [.03, height - .015, -.467], [.06, height + .014, -.466]], .007);
  return group;
}

function charm(group: THREE.Group, design: string, mat: THREE.Material, pos: number[], size: number) {
  const [x, height, z] = pos;
  if (design.includes("star") || design.includes("snowflake") || design.includes("sun")) {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, r = size * (i % 2 ? .48 : 1); if (!i) shape.moveTo(Math.sin(a) * r, Math.cos(a) * r); else shape.lineTo(Math.sin(a) * r, Math.cos(a) * r); }
    shape.closePath(); const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: size * .3, bevelEnabled: true, bevelSize: size * .08, bevelThickness: size * .08, bevelSegments: 2, steps: 1 }), mat);
    mesh.position.set(x, height, z); group.add(mesh);
  } else if (design.includes("heart")) {
    ball(group, mat, [x - size * .28, height + size * .15, z], [size * .47, size * .47, size * .3]);
    ball(group, mat, [x + size * .28, height + size * .15, z], [size * .47, size * .47, size * .3]);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(size * .62, size, 24), mat); tip.rotation.z = Math.PI; tip.position.set(x, height - size * .26, z); tip.scale.z = .55; group.add(tip);
  } else if (design.includes("ribbon") || design.includes("bow")) bow(group, mat, x, height, z, size / .13);
  else if (design.includes("flower") || design.includes("daisy")) {
    for (let i = 0; i < 5; i++) ball(group, mat, [x + Math.sin(i * 1.257) * size * .55, height + Math.cos(i * 1.257) * size * .55, z], [size * .4, size * .4, size * .2]);
    ball(group, material("#e8bc6b"), pos, [size * .25, size * .25, size * .22]);
  } else if (design.includes("moon")) {
    const curve = new THREE.EllipseCurve(0, 0, size, size, .55, Math.PI * 1.75, false, 0);
    line(group, mat, curve.getPoints(24).map(p => [x + p.x, height + p.y, z]), size * .22);
  } else if (design.includes("crystal") || design.includes("diamond")) {
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(size), mat); mesh.position.set(x, height, z); mesh.scale.z = .55; group.add(mesh);
  } else ball(group, mat, pos, [size * .7, size, size * .5]);
}

export function createAccessories(selection: Accessories) {
  const group = new THREE.Group(); group.name = "worn-accessories";
  for (const id of Object.values(selection)) {
    const item = ACCESSORIES.find(accessory => accessory.id === id)!; if (item.design === "none") continue;
    const mat = material(item.color, .43), metal = material(item.accent, .33);
    if (item.slot === "ears") for (const sign of [-1, 1]) {
      line(group, metal, [[sign * .57, 2, -.05], [sign * .59, 1.89, -.06]], .008);
      charm(group, item.design, mat, [sign * .59, 1.86, -.065], .048);
    }
    if (item.slot === "necklace") {
      line(group, metal, [[-.12, y(1.92), -.1], [-.13, y(1.77), -.2], [0, y(1.7), -.22], [.13, y(1.77), -.2], [.12, y(1.92), -.1]], .008);
      if (item.design.includes("pearl")) for (let i = 0; i < 9; i++) ball(group, mat, [Math.sin((i / 8 - .5) * 2.2) * .14, y(1.72 + Math.abs(i - 4) * .018), -.215], [.018, .018, .018]);
      else charm(group, item.design, mat, [0, y(1.69), -.23], .034);
    }
    if (item.slot === "bag") {
      line(group, metal, [[.51, y(1.29), -.08], [.63, y(1.17), -.08], [.64, y(.97), -.12]], .014);
      ball(group, mat, [.64, y(.89), -.1], [.14, .11, .09]);
      line(group, mat, [[.54, y(.99), -.1], [.64, y(1.09), -.1], [.74, y(.99), -.1]], .018);
      charm(group, item.design, metal, [.64, y(.88), -.19], .055);
      if (item.design === "teddy-bag") for (const sign of [-1, 1]) ball(group, mat, [.64 + sign * .09, y(1.04), -.1], [.044, .04, .04]);
    }
    if (item.slot === "hair") {
      if (item.design.includes("band")) {
        line(group, mat, [[-.6, 2.33, 0], [-.45, 2.64, 0], [0, 2.78, 0], [.45, 2.64, 0], [.6, 2.33, 0]], .026);
        for (const sign of [-1, 1]) {
          if (item.design === "cat-band") { const ear = new THREE.Mesh(new THREE.ConeGeometry(.12, .23, 3), mat); ear.position.set(sign * .38, 2.84, 0); ear.scale.z = .5; group.add(ear); }
          else ball(group, mat, [sign * .33, item.design === "bunny-band" ? 2.96 : 2.8, 0], [.095, item.design === "bunny-band" ? .25 : .09, .065]);
        }
      } else if (item.design === "sunhat" || item.design === "rose-beret") {
        ball(group, mat, [0, 2.66, .015], [.68, .16, .54]);
        if (item.design === "sunhat") ball(group, mat, [0, 2.59, .015], [.84, .035, .68]);
      } else if (item.design.includes("crown") || item.design.includes("tiara")) {
        line(group, metal, [[-.28, 2.68, -.25], [0, 2.7, -.35], [.28, 2.68, -.25]], .028);
        for (let i = 0; i < 5; i++) charm(group, "diamond", mat, [(i - 2) * .1, 2.78 + (2 - Math.abs(i - 2)) * .045, -.31], .04);
      } else charm(group, item.design, mat, [.4, 2.55, -.37], .11);
    }
  }
  return group;
}
