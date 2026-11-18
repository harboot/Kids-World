import { POND, pondDistance, shoreRadius } from './garden-terrain.js';

export const BRIDGE = { x: POND.x, start: 5.0, end: 22.1, halfWidth: 1.37, railX: 1.26, peak: 1.08 };
const shoreMargin = 1.015;

export function bridgeHeight(z) {
  const t = (z - BRIDGE.start) / (BRIDGE.end - BRIDGE.start);
  return t > 0 && t < 1 ? BRIDGE.peak * Math.sin(Math.PI * t) ** 1.25 : 0;
}

function bridgeWidth(radius) {
  return BRIDGE.railX - 0.08 - radius;
}

export function bridgeDeckHeight(x, z) {
  return z >= BRIDGE.start && z <= BRIDGE.end && Math.abs(x - BRIDGE.x) <= BRIDGE.halfWidth ?
    bridgeHeight(z) : -Infinity;
}

export function blocksPondTravel(x, z, radius) {
  const offset = Math.abs(x - BRIDGE.x);
  if (z >= BRIDGE.start && z <= BRIDGE.end) {
    if (offset <= bridgeWidth(radius)) return false;
    const besideRail = z >= BRIDGE.start + 0.56 && z <= BRIDGE.end - 0.56;
    if (besideRail && offset < BRIDGE.railX + 0.085 + radius) return true;
  }
  if (Math.abs(x - POND.x) > POND.radiusX * 1.19 + radius ||
      Math.abs(z - POND.z) > POND.radiusZ * 1.19 + radius) return false;
  // Leave room for the player's footprint on the dry bank.
  return pondDistance(x, z) < shoreMargin + radius / Math.min(POND.radiusX, POND.radiusZ) * 1.24;
}

export function fishPose(index, time, pose) {
  const angle = time * (index % 2 ? -1 : 1) * (0.71 + index * 0.028) + index * 2.39996;
  const size = 0.37 + index * 0.046;
  const dx = Math.cos(angle) * POND.radiusX * size;
  const dz = Math.sin(angle) * POND.radiusZ * size;
  pose.x = POND.x + dx;
  pose.y = POND.waterY - 0.137 + Math.cos(angle * 2) * 0.016;
  pose.z = POND.z + dz;
  pose.yaw = Math.atan2(index % 2 ? dz * POND.radiusX : -dz * POND.radiusX,
    index % 2 ? -dx * POND.radiusZ : dx * POND.radiusZ);
  pose.tail = Math.sin(time * (9 + index * 0.47) + index) * 0.48;
}

export function addPond(THREE, { scene, mesh, box, facet, matte, obstacles, instances, getTerrainHeight, playerRadius }) {
  addWater(THREE, scene);
  addBridge(THREE, { box, matte, instances });

  const largeRock = matte(0x88918a);
  const rockMesh = new THREE.DodecahedronGeometry(1);
  for (const [x, z, sx, sy, sz, angle] of [
    [-7.15, 10.35, 1.12, 0.9, 0.78, 0.6], [-7.2, 17.35, 1.24, 0.95, 0.84, 1.8],
    [-17.58, 6.43, 1.16, 0.87, 0.81, 0.25], [-17.4, 21.3, 1.28, 1.03, 0.88, 1.06],
  ]) {
    const y = getTerrainHeight(x, z);
    mesh(rockMesh, largeRock, x, y + sy * 0.31, z, sx, sy, sz, scene, true).rotation.y = angle;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const width = sx * 0.84 + playerRadius;
    const depth = sz * 0.84 + playerRadius;
    obstacles.push({
      height: y + sy * 1.23,
      touches(px, pz) {
        const dx = px - x;
        const dz = pz - z;
        return Math.hypot((dx * c - dz * s) / width, (dz * c + dx * s) / depth) < 1;
      },
    });
  }
  const stones = [];
  const reeds = [];
  const seedPods = [];
  for (let i = 0; i < 64; i++) {
    const angle = i * 2.39996;
    const r = shoreRadius(angle) * (1.023 + (i % 7) * 0.023);
    const x = POND.x + Math.cos(angle) * POND.radiusX * r;
    const z = POND.z + Math.sin(angle) * POND.radiusZ * r;
    if (Math.abs(x - BRIDGE.x) < 2.08) continue;
    const y = getTerrainHeight(x, z);
    const s = 0.1 + (i % 6) * 0.027;
    stones.push([x, y + s * 0.25, z, s * 1.22, s * 0.58, s * 0.87, angle]);
    if (i % 3 !== 0) continue;
    const h = 0.44 + (i % 7) * 0.057;
    reeds.push([x + 0.12, y + h * 0.48, z, 0.04, h, 0.035, angle]);
    reeds.push([x - 0.13, y + h * 0.32, z + 0.09, 0.033, h * 0.76, 0.03, -angle]);
    seedPods.push([x + 0.12, y + h * 0.97, z, 0.052, 0.125, 0.05, angle]);
  }
  instances(facet, matte(0xa9a792), stones);
  instances(box, matte(0x55784c), reeds);
  instances(facet, matte(0x8b6446), seedPods);

  const fins = new THREE.BufferGeometry();
  fins.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, 0, 0.078, -0.30, 0, -0.078, -0.30,
  ], 3));
  fins.computeVertexNormals();
  const eye = new THREE.SphereGeometry(0.035, 5, 4);
  const dark = matte(0x303841);
  const palette = [0xf6a443, 0xffe082, 0xe66d72, 0x70c9db, 0xbb8ad1, 0xf27a54, 0x90d4a9, 0xf8c561];
  const fish = palette.map((color, index) => {
    const group = new THREE.Group();
    const tail = new THREE.Group();
    group.name = `Pond fish ${index + 1}`;
    const skin = matte(color);
    mesh(facet, skin, 0, 0, 0, 0.15, 0.086, 0.41, group);
    const fin = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });
    mesh(fins, fin, 0, 0, 0, 1, 1, 1, tail);
    tail.position.z = -0.33;
    group.add(tail);
    for (const side of [-1, 1]) mesh(eye, dark, side * 0.102, 0.045, 0.22, 1, 1, 1, group);
    group.scale.setScalar(0.88 + (index % 4) * 0.12);
    scene.add(group);
    return { group, tail };
  });
  const pose = { x: 0, y: 0, z: 0, yaw: 0, tail: 0 };
  let time = 0;

  function update(dt) {
    time += dt;
    for (let index = 0; index < fish.length; index++) {
      fishPose(index, time, pose);
      fish[index].group.position.set(pose.x, pose.y, pose.z);
      fish[index].group.rotation.y = pose.yaw;
      fish[index].tail.rotation.y = pose.tail;
    }
  }

  return {
    update,
    reset() {
      time = 0;
      update(0);
    },
  };
}

function addWater(THREE, scene) {
  const segments = 48;
  const rings = [0.26, 0.53, 0.79, 1.085];
  const positions = [POND.x, POND.waterY, POND.z];
  const deep = new THREE.Color(0x23788d);
  const shallow = new THREE.Color(0x5ea99d);
  const color = new THREE.Color();
  const colors = [deep.r, deep.g, deep.b];
  const indices = [];
  for (let ring = 0; ring < rings.length; ring++) {
    for (let i = 0; i < segments; i++) {
      const angle = i * Math.PI * 2 / segments;
      const r = rings[ring] * shoreRadius(angle);
      positions.push(POND.x + POND.radiusX * r * Math.cos(angle), POND.waterY,
        POND.z + POND.radiusZ * r * Math.sin(angle));
      color.copy(deep).lerp(shallow, ring / 4 + 0.11 * (1 + Math.sin(i * 2.431)));
      colors.push(color.r, color.g, color.b);
      const a = 1 + ring * segments + i;
      const b = 1 + ring * segments + (i + 1) % segments;
      if (ring === 0) indices.push(0, b, a);
      else indices.push(a - segments, b - segments, a, a, b - segments, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const water = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({
    vertexColors: true, opacity: 0.62, transparent: true, depthWrite: false,
  }));
  water.receiveShadow = true;
  scene.add(water);

  const ripples = [];
  for (let i = 0; i < 19; i++) {
    const angle = i * 2.39996;
    const r = 0.27 + (i % 7) * 0.073;
    const x = POND.x + Math.cos(angle) * POND.radiusX * r;
    const z = POND.z + Math.sin(angle) * POND.radiusZ * r;
    if (Math.abs(x - BRIDGE.x) < 1.62) continue;
    const y = POND.waterY + 0.005;
    ripples.push(x, y, z, x + 0.28 + (i % 4) * 0.11, y, z + 0.055);
  }
  const detail = new THREE.BufferGeometry();
  detail.setAttribute('position', new THREE.Float32BufferAttribute(ripples, 3));
  scene.add(new THREE.LineSegments(detail,
    new THREE.LineBasicMaterial({ color: 0xbfeee2, transparent: true, opacity: 0.44, depthWrite: false })));
}

function addBridge(THREE, { box, matte, instances }) {
  const planks = [];
  const planksColor = [];
  const posts = [];
  const rails = [];
  const colors = [0xb7834e, 0xbf905e, 0xc69b68, 0xce9c62].map(color => new THREE.Color(color));
  const total = BRIDGE.end - BRIDGE.start;
  const count = 46;
  const length = total / count;
  const pitch = (z, half) => -Math.atan2(bridgeHeight(z + half) - bridgeHeight(z - half), 2 * half);
  for (let i = 0; i < count; i++) {
    const z = BRIDGE.start + (i + 0.5) * length;
    planks.push([BRIDGE.x, bridgeHeight(z) - 0.064, z, BRIDGE.halfWidth * 2, 0.14, length - 0.023, 0, pitch(z, length / 2)]);
    planksColor.push(colors[(i * 7 + Math.floor(i / 3)) % colors.length]);
  }
  const railStart = BRIDGE.start + 0.56;
  const railLength = total - 1.12;
  const bays = 9;
  for (const side of [-1, 1]) {
    const x = BRIDGE.x + side * BRIDGE.railX;
    for (let i = 0; i <= bays; i++) {
      const z = railStart + i * railLength / bays;
      const y = bridgeHeight(z);
      const base = i % 3 === 0 ? -0.4 : y - 0.14;
      const height = y + 0.82 - base;
      posts.push([x, base + height / 2, z, 0.15, height, 0.17]);
      if (i === bays) continue;
      const mid = z + railLength / (bays * 2);
      const segment = railLength / bays;
      const slope = pitch(mid, segment / 2);
      for (const level of [0.43, 0.77]) {
        rails.push([x, bridgeHeight(mid) + level, mid, 0.14, 0.11, segment + 0.08, 0, slope]);
      }
    }
  }
  instances(box, matte(0xffffff), planks, planksColor, true);
  instances(box, matte(0x8c6242), posts, null, true);
  instances(box, matte(0xe2b87e), rails, null, true);
}
