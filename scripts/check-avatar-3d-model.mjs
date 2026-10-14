import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";
import { AnimationMixer, SkinnedMesh, Vector3, Box3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Node has no GPU ImageBitmap. Validate/decompress packed PNGs, then supply the
// bitmap dimensions for CPU geometry checks; the browser suite renders the maps.
globalThis.self = globalThis;
globalThis.createImageBitmap = async blob => {
  const png=Buffer.from(await blob.arrayBuffer());
  assert.equal(png.subarray(1,4).toString(),"PNG");
  const width=png.readUInt32BE(16), height=png.readUInt32BE(20), bitDepth=png[24], channels={0:1,2:3,4:2,6:4}[png[25]];
  assert.ok(width>=256 && height>=256 && channels);
  const chunks=[];
  for(let offset=8;offset<png.length;) {
    const size=png.readUInt32BE(offset), kind=png.subarray(offset+4,offset+8).toString();
    if(kind==="IDAT") chunks.push(png.subarray(offset+8,offset+8+size));
    offset+=size+12;
  }
  assert.equal(inflateSync(Buffer.concat(chunks)).length,(Math.ceil(width*channels*bitDepth/8)+1)*height);
  return { width,height,close(){} };
};

const bytes = await readFile("public/models/avatar-prototype/avatar.glb");
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
assert.deepEqual(gltf.animations.map(clip => clip.name).sort(), ["dance", "idle", "pose", "wave"]);
const meshes = [];
gltf.scene.traverse(node => { if (node instanceof SkinnedMesh) meshes.push(node); });
assert.ok(meshes.some(m => m.material.name === "Vanilla dress" && m.material.map?.image.width >= 256), "checked cloth must have its packed weave texture");
assert.ok(meshes.some(m => m.material.name === "Honey iris" && m.material.map?.image.width >= 256), "brown iris must have its packed painted fibres");
const body = meshes.find(node => node.name === "Continuous_body_skin");
assert.ok(body, "one continuous skin mesh must exist");
assert.equal(body.skeleton.bones.length, 17);
const weights = body.geometry.getAttribute("skinWeight"), indices = body.geometry.getAttribute("skinIndex"), positions = body.geometry.getAttribute("position");
const names = body.skeleton.bones.map(b => b.name);
assert.ok(!names.includes("root"), "root is reserved by Three.js animation binding");
assert.equal(meshes.filter(m => m.name.startsWith("Eyelid") && m.morphTargetDictionary?.blink === 0).length, 2, "both eyelids need a real closing surface morph");
let elbow = 0, knee = 0;
for (let i = 0; i < weights.count; i++) {
  let sum = 0;
  const influences = [];
  for (let j = 0; j < 4; j++) {
    const weight = weights.getComponent(i, j);
    sum += weight;
    if (weight > .05) influences.push(names[indices.getComponent(i,j)]);
  }
  assert.ok(Math.abs(sum - 1) < .0001, "all weights must be normalized");
  if (influences.some(n => n.includes("upper_arm")) && influences.some(n => n.includes("forearm"))) elbow++;
  if (influences.some(n => n.includes("thigh")) && influences.some(n => n.includes("shin"))) knee++;
}
assert.ok(elbow > 30 && knee > 30, "elbows and knees must blend neighbouring bones");
const mixer = new AnimationMixer(gltf.scene);
function pose(name, time) {
  mixer.stopAllAction();
  const action = mixer.clipAction(gltf.animations.find(clip => clip.name === name));
  action.reset().play();
  mixer.setTime(time);
  gltf.scene.updateMatrixWorld(true);
  body.skeleton.update();
  return Array.from({ length: positions.count }, (_,i) => body.getVertexPosition(i, new Vector3()).applyMatrix4(body.matrixWorld));
}
const rest = pose("idle", 0);
const edge = body.geometry.index;
// Weld duplicate UV vertices and ensure skin remains one connected volume.
const parent = Array.from({ length: positions.count }, (_,i) => i), welded = new Map();
function root(i) { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; }
function union(a,b) { parent[root(a)] = root(b); }
for (let i = 0; i < positions.count; i++) {
  const key = rest[i].toArray().map(n => Math.round(n * 100000)).join(",");
  if (welded.has(key)) union(i, welded.get(key)); else welded.set(key,i);
}
for (let i = 0; i < edge.count; i += 3) { union(edge.getX(i), edge.getX(i+1)); union(edge.getX(i),edge.getX(i+2)); }
assert.equal(new Set(parent.map((_,i) => root(i))).size, 1, "arms, legs and torso must be one connected skin");
const results = [], signatures = [];
for (const clip of ["wave", "dance", "pose"]) {
  const points = pose(clip, 1.5);
  const box = new Box3().setFromPoints(points);
  let maxRatio = 0;
  for (let i = 0; i < edge.count; i += 3) {
    for (let j = 0; j < 3; j++) {
      const a = edge.getX(i+j), b = edge.getX(i+(j+1)%3);
      const original = rest[a].distanceTo(rest[b]);
      const ratio = points[a].distanceTo(points[b])/original;
      if (ratio > maxRatio) maxRatio=ratio;
    }
  }
  const moved = points.filter((p,i) => p.distanceTo(rest[i]) > .03).length;
  assert.ok(moved > 100, `${clip} must deform actual mesh vertices`);
  assert.ok(maxRatio < 4, `${clip} must not stretch neighbouring vertices into spikes`);
  assert.ok(box.min.y > .1 && box.max.y < 2.2, "body must stay on the stage");
  results.push({ clip, moved, maxEdgeStretch: Number(maxRatio.toFixed(2)) });
  signatures.push(points);
}
for (let a=0;a<signatures.length;a++) for (let b=a+1;b<signatures.length;b++) {
  const difference=signatures[a].reduce((sum,p,i)=>sum+p.distanceTo(signatures[b][i]),0)/positions.count;
  assert.ok(difference>.015,"different motions must have different bone poses");
}
console.log(JSON.stringify({ bones: names.length, meshes: meshes.length, connectedSkin: true, elbow, knee, bytes: bytes.length, motions: results }, null, 2));
