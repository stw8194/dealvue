import * as THREE from "three";

/** Closed, rounded geometry following the source design; front UVs remain unchanged. */
export function createPortraitVolume(portrait: HTMLCanvasElement) {
  const width = 224, height = 336, stride = width + 1;
  const pixels = portrait.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, portrait.width, portrait.height).data;
  const pixel = (x: number, y: number) => (Math.min(portrait.height - 1, Math.max(0, Math.round(y))) * portrait.width + Math.min(portrait.width - 1, Math.max(0, Math.round(x)))) * 4;
  const cells = new Uint8Array(width * height), distance = new Float32Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const at = y * width + x; cells[at] = pixels[pixel((x + .5) / width * portrait.width, (y + .5) / height * portrait.height) + 3] > 70 ? 1 : 0; distance[at] = cells[at] ? 1000 : 0;
  }
  // Discard isolated atlas-edge specks; keep all meaningful silhouette components.
  const visited = new Uint8Array(cells.length);
  for (let i = 0; i < cells.length; i++) {
    if (!cells[i] || visited[i]) continue;
    const members = [i]; visited[i] = 1;
    for (let j = 0; j < members.length; j++) {
      const at = members[j], x = at % width;
      for (const next of [x ? at - 1 : -1, x < width - 1 ? at + 1 : -1, at - width, at + width]) if (next >= 0 && next < cells.length && cells[next] && !visited[next]) { visited[next] = 1; members.push(next); }
    }
    if (members.length < 5) for (const at of members) { cells[at] = 0; distance[at] = 0; }
  }
  const diagonal = Math.SQRT2;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const at = y * width + x;
    if (cells[at]) distance[at] = Math.min(distance[at], x ? distance[at - 1] + 1 : 1, y ? distance[at - width] + 1 : 1,
      x && y ? distance[at - width - 1] + diagonal : 1, x < width - 1 && y ? distance[at - width + 1] + diagonal : 1);
  }
  for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) {
    const at = y * width + x;
    if (cells[at]) distance[at] = Math.min(distance[at], x < width - 1 ? distance[at + 1] + 1 : 1, y < height - 1 ? distance[at + width] + 1 : 1,
      x < width - 1 && y < height - 1 ? distance[at + width + 1] + diagonal : 1, x && y < height - 1 ? distance[at + width - 1] + diagonal : 1);
  }
  const smoothstep = (a: number, b: number, value: number) => { const t = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  let depth = new Float32Array(cells.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const at = y * width + x, v = y / height;
    const head = 1 - smoothstep(.455, .515, v), feet = smoothstep(.79, .86, v);
    const radius = THREE.MathUtils.lerp(THREE.MathUtils.lerp(.25, .115, feet), .57, head);
    const span = width * THREE.MathUtils.lerp(THREE.MathUtils.lerp(.15, .055, feet), .30, head);
    const t = Math.min(1, distance[at] / span);
    depth[at] = radius * Math.sqrt(t * (2 - t));
  }
  // Smooth the distance-field ridges before making the surface, rather than leaving terraces.
  for (let pass = 0; pass < 4; pass++) {
    const blurred = new Float32Array(depth.length);
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
      const at = y * width + x; if (!cells[at]) continue;
      blurred[at] = (depth[at] * 4 + (depth[at - 1] + depth[at + 1] + depth[at - width] + depth[at + width]) * 2
        + depth[at - width - 1] + depth[at - width + 1] + depth[at + width - 1] + depth[at + width + 1]) / 16;
    }
    depth = blurred;
  }
  const positions: number[] = [], uvs: number[] = [], sideUvs: number[] = [], front: number[] = [], back: number[] = [];
  const indices = new Int32Array(stride * (height + 1)).fill(-1), rearIndices = new Int32Array(indices.length).fill(-1);
  const boundary = new Set<number>(), edges = new Map<number, Set<number>>();
  function vertex(x: number, y: number) {
    const at = y * stride + x; if (indices[at] >= 0) return indices[at];
    let value = 0, count = 0;
    for (const [cx, cy] of [[x - 1, y - 1], [x, y - 1], [x - 1, y], [x, y]]) {
      if (cx < 0 || cy < 0 || cx >= width || cy >= height || !cells[cy * width + cx]) continue;
      value += depth[cy * width + cx]; count++;
    }
    const rim = count < 4, z = rim ? 0 : value / count;
    const index = positions.length / 3; indices[at] = index;
    positions.push((x / width - .5) * 2, (1 - y / height) * 3, z); uvs.push(x / width, 1 - y / height);
    sideUvs.push(.5 + Math.atan2((x / width - .5) * 2 / .85, z / .57) / (Math.PI * 2), 1 - y / height);
    rearIndices[at] = rim ? index : index + 1;
    if (rim) boundary.add(index);
    else {
      positions.push((x / width - .5) * 2, (1 - y / height) * 3, -z); uvs.push(x / width, 1 - y / height);
      sideUvs.push(.5 + Math.atan2((x / width - .5) * 2 / .85, -z / .57) / (Math.PI * 2), 1 - y / height);
    }
    return index;
  }
  function rearVertex(x: number, y: number) { return rearIndices[y * stride + x]; }
  function rim(a: number, b: number) {
    if (!edges.has(a)) edges.set(a, new Set()); if (!edges.has(b)) edges.set(b, new Set());
    edges.get(a)!.add(b); edges.get(b)!.add(a);
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!cells[y * width + x]) continue;
    const a = vertex(x, y), b = vertex(x + 1, y), c = vertex(x, y + 1), d = vertex(x + 1, y + 1);
    front.push(a, c, b, b, c, d); back.push(rearVertex(x, y), rearVertex(x + 1, y), rearVertex(x, y + 1), rearVertex(x + 1, y), rearVertex(x + 1, y + 1), rearVertex(x, y + 1));
    if (!y || !cells[(y - 1) * width + x]) rim(b, a);
    if (y === height - 1 || !cells[(y + 1) * width + x]) rim(c, d);
    if (!x || !cells[y * width + x - 1]) rim(a, c);
    if (x === width - 1 || !cells[y * width + x + 1]) rim(d, b);
  }
  // Shared front/back rim vertices remove the flat strip. Round its subpixel stair steps.
  for (let pass = 0; pass < 3; pass++) {
    const next = [...positions];
    for (const index of boundary) {
      const neighbors = edges.get(index); if (!neighbors?.size) continue;
      for (let axis = 0; axis < 2; axis++) {
        let sum = 0; for (const neighbor of neighbors) sum += positions[neighbor * 3 + axis];
        next[index * 3 + axis] = positions[index * 3 + axis] * .5 + sum / neighbors.size * .5;
      }
    }
    for (let i = 0; i < positions.length; i++) positions[i] = next[i];
  }
  const geometry = new THREE.BufferGeometry();
  if (!positions.length) throw Error("portrait artwork is empty");
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("portraitSideUv", new THREE.Float32BufferAttribute(sideUvs, 2));
  geometry.setIndex([...front, ...back]); geometry.addGroup(0, front.length, 0); geometry.addGroup(front.length, back.length, 1); geometry.computeVertexNormals();
  const rear = document.createElement("canvas"); rear.width = portrait.width; rear.height = portrait.height;
  const rearPixels = new Uint8ClampedArray(pixels);
  // No rear reference exists: continue source hair colors, never a second face.
  for (let y = 0; y < portrait.height * .49; y++) for (let x = 0; x < portrait.width; x++) {
    const at = pixel(x, y); if (!rearPixels[at + 3]) continue;
    const sample = pixel(portrait.width * .25 + x * .5, portrait.height * (.08 + .025 * Math.sin(x / 48) + .055 * (y / (portrait.height * .49))));
    if (pixels[sample + 3] > 100) { const strand = .93 + .07 * Math.sin(x * .17 + y * .012); for (let c = 0; c < 3; c++) rearPixels[at + c] = pixels[sample + c] * strand; }
  }
  rear.getContext("2d")!.putImageData(new ImageData(rearPixels, portrait.width, portrait.height), 0, 0);
  const sideImage = document.createElement("canvas"); sideImage.width = portrait.width; sideImage.height = portrait.height;
  const sideContext = sideImage.getContext("2d")!; sideContext.filter = "blur(5px)"; sideContext.drawImage(portrait, 0, 0); sideContext.filter = "none";
  const sidePixels = sideContext.getImageData(0, 0, portrait.width, portrait.height);
  // Carry hair strands around the head using angular UVs, instead of stretching a planar image sideways.
  for (let x = 0; x < portrait.width; x++) {
    const sample = pixel(portrait.width * (.3 + .4 * x / portrait.width), portrait.height * (.105 + .015 * Math.sin(x / 45)));
    for (let y = 0; y < portrait.height * .49; y++) {
      const at = pixel(x, y), strand = .96 + .035 * Math.sin(x * .14) + .025 * Math.sin(y / 95);
      for (let c = 0; c < 3; c++) sidePixels.data[at + c] = pixels[sample + c] * strand;
      sidePixels.data[at + 3] = 255;
    }
  }
  sideContext.putImageData(sidePixels, 0, 0);
  const texture = new THREE.CanvasTexture(portrait), rearTexture = new THREE.CanvasTexture(rear), sideTexture = new THREE.CanvasTexture(sideImage);
  texture.colorSpace = rearTexture.colorSpace = sideTexture.colorSpace = THREE.SRGBColorSpace;
  const surface = new THREE.MeshBasicMaterial({ map: texture, alphaTest: .12, side: THREE.DoubleSide });
  const rearSurface = new THREE.MeshBasicMaterial({ map: rearTexture, alphaTest: .12, side: THREE.DoubleSide });
  const turnSide = { value: 0 };
  for (const material of [surface, rearSurface]) {
    material.onBeforeCompile = shader => {
      shader.uniforms.portraitSide = { value: sideTexture }; shader.uniforms.turnSide = turnSide;
      shader.vertexShader = "attribute vec2 portraitSideUv; varying vec2 vPortraitSideUv; varying vec3 vPortraitNormal;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvPortraitNormal = normal; vPortraitSideUv = portraitSideUv;");
      shader.fragmentShader = "uniform sampler2D portraitSide; uniform float turnSide; varying vec2 vPortraitSideUv; varying vec3 vPortraitNormal;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
        float portraitFacing = abs(normalize(vPortraitNormal).z);
        float portraitBlend = turnSide * (1.0 - smoothstep(0.15, 0.85, portraitFacing));
        vec2 portraitSideUv = vec2(mix(vMapUv.x, vPortraitSideUv.x, smoothstep(0.49, 0.545, vMapUv.y)), vMapUv.y);
        vec4 sideColor = texture2D(portraitSide, portraitSideUv);
        diffuseColor.rgb = mix(diffuseColor.rgb, sideColor.rgb, portraitBlend);
        diffuseColor.a = mix(diffuseColor.a, sideColor.a, portraitBlend);
        diffuseColor.rgb *= 1.0 - 0.10 * turnSide * (1.0 - portraitFacing);
      `);
    };
  }
  const group = new THREE.Group(); group.name = "original-design-volume"; group.add(new THREE.Mesh(geometry, [surface, rearSurface]));
  group.userData.turnSide = turnSide;
  surface.addEventListener("dispose", () => sideTexture.dispose());
  let maxDepth = 0; for (let i = 2; i < positions.length; i += 3) maxDepth = Math.max(maxDepth, positions[i]);
  group.userData.depth = maxDepth * 2; group.userData.vertices = positions.length / 3; return group;
}
