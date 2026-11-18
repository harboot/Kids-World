import { POND, pondDistance, shoreRadius } from './garden-terrain.js';

export const BRIDGE = { x: POND.x, start: 5.0, end: 22.1, halfWidth: 1.37, railX: 1.26, peak: 1.08 };
const shoreMargin = 1.015;
const food = { x: -9.66, z: 13.46 };
const FEED_DURATION = 3.6;
const feedCue = [[74, { duration: 0.18, level: 0.10 }],
  [81, { duration: 0.22, level: 0.13, wave: 'triangle' }, 0.13],
  [78, { duration: 0.24, level: 0.08 }, 0.3]];

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

export function addPond(THREE, { scene, mesh, box, facet, matte, obstacles, instances, getTerrainHeight, playerRadius,
  feedFish, playCue }) {
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
  const feeder = addFishFeeder(THREE, { scene, mesh, box, facet, matte, getTerrainHeight });
  const { lerp, smoothstep } = THREE.MathUtils;
  let time = 0;
  let feedTime = FEED_DURATION;
  let gathering = [];

  function feed() {
    if (feedTime < FEED_DURATION) return false;
    gathering = fish.map(({ group }, index) => ({ index, distance: Math.hypot(group.position.x - food.x, group.position.z - food.z) }))
      .sort((a, b) => a.distance - b.distance).slice(0, 3).map(({ index }) => index);
    feedTime = 0;
    feeder.update(feedTime);
    playCue?.(feedCue);
    feedFish();
    return true;
  }

  function update(dt) {
    time += dt;
    if (feedTime < FEED_DURATION) {
      feedTime = Math.min(FEED_DURATION, feedTime + dt);
      feeder.update(feedTime);
    }
    const attraction = smoothstep(feedTime, 0.38, 1.68) * (1 - smoothstep(feedTime, 2.25, FEED_DURATION));
    for (let index = 0; index < fish.length; index++) {
      fishPose(index, time, pose);
      const group = attraction > 0 ? gathering.indexOf(index) : -1;
      if (group >= 0) {
        const angle = group * Math.PI * 2 / 3 + feedTime * 1.75;
        const x = food.x - 0.36 + 0.31 * Math.cos(angle);
        const z = food.z + 0.53 * Math.sin(angle);
        const turn = Math.atan2(x - pose.x, z - pose.z) - pose.yaw;
        pose.yaw += Math.atan2(Math.sin(turn), Math.cos(turn)) * attraction;
        pose.x = lerp(pose.x, x, attraction);
        pose.z = lerp(pose.z, z, attraction);
      }
      fish[index].group.position.set(pose.x, pose.y, pose.z);
      fish[index].group.rotation.y = pose.yaw;
      fish[index].tail.rotation.y = pose.tail;
    }
  }

  return {
    feedingSpot: {
      ...feeder.site, anchorY: 0.85, label: 'Feed fish', radius: 1.47, silent: true,
      reachable: player => !blocksPondTravel(player.x, player.z, playerRadius) &&
        getTerrainHeight(player.x, player.z) > POND.waterY + 0.04,
      get active() { return feedTime === FEED_DURATION; },
      act: feed,
    },
    update,
    reset() {
      time = 0;
      feedTime = FEED_DURATION;
      gathering = [];
      feeder.update(feedTime);
      update(0);
    },
  };
}

function addFishFeeder(THREE, { scene, mesh, box, facet, matte, getTerrainHeight }) {
  const site = { x: -7.29, z: 13.46 };
  const ground = getTerrainHeight(site.x, site.z);
  const stand = new THREE.Group();
  stand.name = 'Fish feeding sign';
  stand.position.set(site.x, ground, site.z - 0.32);
  stand.rotation.y = Math.PI / 2;
  scene.add(stand);
  const wood = matte(0x906747);
  const board = matte(0xe3ba79);
  const teal = matte(0x3c7e7d);
  mesh(box, wood, 0, 0.39, 0, 0.12, 0.8, 0.13, stand);
  mesh(box, board, 0, 0.8, 0.022, 0.68, 0.36, 0.13, stand);
  const circle = new THREE.CircleGeometry(1, 12);
  mesh(circle, teal, 0.055, 0.8, 0.091, 0.175, 0.095, 1, stand);
  const tail = new THREE.Shape().moveTo(-0.08, 0).lineTo(-0.22, 0.08).lineTo(-0.22, -0.08).closePath();
  mesh(new THREE.ShapeGeometry(tail), teal, 0, 0.8, 0.093, 1, 1, 1, stand);
  mesh(circle, board, 0.151, 0.821, 0.094, 0.022, 0.022, 1, stand);

  const bucketZ = site.z + 0.36;
  mesh(new THREE.CylinderGeometry(0.23, 0.17, 0.31, 9), wood, site.x, ground + 0.155, bucketZ, 1, 1, 1);
  mesh(new THREE.TorusGeometry(0.219, 0.027, 5, 12), teal, site.x, ground + 0.308, bucketZ, 1, 1, 1).rotation.x = -Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.198, 0.198, 0.035, 9), matte(0xb38751), site.x, ground + 0.283, bucketZ, 1, 1, 1);

  const pelletColor = matte(0xeab85d);
  const pellets = Array.from({ length: 6 }, (_, index) => {
    const part = mesh(facet, pelletColor, site.x, ground + 0.58, site.z, 0.072, 0.061, 0.077);
    part.name = 'Fish food pellet';
    return { part, x: food.x + 0.24 * Math.cos(index * 2.4), z: food.z + 0.44 * Math.sin(index * 2.4) };
  });
  const rippleShape = new THREE.RingGeometry(0.83, 1, 20).rotateX(-Math.PI / 2);
  const ripples = pellets.slice(0, 3).map(({ x, z }) => {
    const material = new THREE.MeshBasicMaterial({ color: 0xd8fff1, transparent: true, depthWrite: false });
    const ring = mesh(rippleShape, material, x, POND.waterY + 0.018, z, 1, 1, 1);
    ring.name = 'Fish feeding ripple';
    ring.renderOrder = 1;
    return ring;
  });

  return {
    site,
    update(time) {
      for (const [i, { part, x, z }] of pellets.entries()) {
        const duration = 0.56 + i * 0.065;
        const age = time - i * 0.065;
        part.visible = age >= 0 && age < duration;
        if (!part.visible) continue;
        const t = age / duration;
        part.position.set(THREE.MathUtils.lerp(site.x, x, t),
          THREE.MathUtils.lerp(ground + 0.58, POND.waterY, t) + 1.55 * t * (1 - t), THREE.MathUtils.lerp(site.z, z, t));
      }
      for (const [i, ring] of ripples.entries()) {
        const t = (time - 0.56 - i * 0.13) / 1.1;
        ring.visible = t >= 0 && t < 1;
        if (!ring.visible) continue;
        ring.scale.setScalar(0.14 + 0.62 * t);
        ring.material.opacity = 0.52 * (1 - t);
      }
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
