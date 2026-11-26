import { fence, headquarters, helipad, hospital, motorPool, repairTank, supplyDepot, radarControl } from './layout.js';

export const maxLocalLights = 4;
export const starCount = 860;
export const scoutHeadlights = Object.freeze({ offset: 10.5, range: 20, intensity: 110, width: 2.7, length: 8.5 });
const warm = 0xffd597;
const cool = 0xe1f1ff;
const beacon = 0xffe4a8;

// A single cached shadow map, just as in the daytime area. Local lights never cast shadows.
export function setNightEnvironment(THREE, scene, touch) {
  scene.background = new THREE.Color(0x142840);
  scene.fog = new THREE.Fog(0x142840, 65, 145);
  const ambient = new THREE.HemisphereLight(0xa8c8ff, 0x8a92a8, .78);
  ambient.name = 'Night ambient';
  scene.add(ambient);
  const moon = new THREE.DirectionalLight(0xb6d3ff, .74);
  moon.name = 'Moonlight';
  moon.position.set(-40, 92, 46);
  moon.castShadow = true;
  const size = touch ? 512 : 1024;
  moon.shadow.mapSize.set(size, size);
  Object.assign(moon.shadow.camera, { left: -122, right: 122, top: 108, bottom: -108, near: 22, far: 209 });
  moon.shadow.camera.updateProjectionMatrix();
  moon.shadow.normalBias = .07;
  moon.shadow.bias = -.00015;
  scene.add(moon);

  // The gameplay camera clips at 115 units. Keep sky decoration camera-relative
  // at 78 units, drawn behind the world, rather than moving terrain or changing Core.
  const skyRadius = 78;
  const cameraPosition = new THREE.Vector3();
  const skyPosition = new THREE.Vector3();
  function anchorSky(object, order) {
    object.frustumCulled = false;
    object.renderOrder = order;
    object.raycast = () => {};
    object.material.depthTest = false;
    object.material.depthWrite = false;
    object.updateMatrix();
    object.onBeforeRender = (_renderer, _scene, camera) => {
      cameraPosition.setFromMatrixPosition(camera.matrixWorld);
      skyPosition.copy(object.position).add(cameraPosition);
      object.matrixWorld.copy(object.matrix).setPosition(skyPosition);
    };
    scene.add(object);
  }
  // One textured, fully illuminated disk with subtle lunar maria.
  const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(3.85, 48),
    new THREE.MeshBasicMaterial({ map: moonTexture(THREE), color: 0xffffff, toneMapped: false, fog: false, side: THREE.DoubleSide }));
  moonDisc.name = 'Full moon';
  const moonDirection = new THREE.Vector3(-.43, .22, -.87).normalize();
  moonDisc.position.copy(moonDirection).multiplyScalar(skyRadius - 1);
  moonDisc.lookAt(0, 0, 0);
  anchorSky(moonDisc, -999);
  let seed = 81019;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const positions = [], colors = [];
  const tint = new THREE.Color(), direction = new THREE.Vector3();
  while (positions.length / 3 < starCount) {
    const azimuth = random() * Math.PI * 2;
    const elevation = Math.asin(.025 + random() * .975);
    direction.set(Math.cos(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.sin(azimuth) * Math.cos(elevation));
    if (direction.dot(moonDirection) > .997) continue;
    positions.push(direction.x * skyRadius, direction.y * skyRadius, direction.z * skyRadius);
    const brightness = .32 + .68 * random() ** 1.8;
    tint.setHex(random() < .12 ? 0xffdfba : 0xd1e2ff).multiplyScalar(brightness);
    colors.push(tint.r, tint.g, tint.b);
  }
  const stars = new THREE.BufferGeometry();
  stars.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  stars.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const sky = new THREE.Points(stars, new THREE.PointsMaterial({ vertexColors: true, size: 1.8, sizeAttenuation: false, fog: false, toneMapped: false }));
  sky.name = 'Night stars';
  anchorSky(sky, -1000);
}

function moonTexture(THREE) {
  const n = 96, data = new Uint8Array(n * n * 4);
  const maria = [[-.38,.26,.25,.34], [.14,.38,.18,.21], [.38,.04,.25,.21],
    [-.12,-.16,.29,.19], [-.51,-.25,.13,.17], [.23,-.42,.16,.12]];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = (x + .5) / n * 2 - 1, v = (y + .5) / n * 2 - 1;
    let shade = 0;
    for (const [cx, cy, rx, ry] of maria) {
      const r = ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2;
      shade += 25 * Math.exp(-r * 1.8);
    }
    const noise = Math.sin(x * 2.13 + y * 3.71) * Math.cos(y * 1.7 - x * .61) * 4;
    const k = (y * n + x) * 4;
    data[k] = 232 - shade + noise;
    data[k + 1] = 239 - shade + noise;
    data[k + 2] = 246 - shade * .85 + noise;
    data[k + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function glowTexture(THREE) {
  const n = 32, pixels = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const r = Math.hypot((i + .5) / n * 2 - 1, (j + .5) / n * 2 - 1);
    const k = (j * n + i) * 4;
    pixels[k] = pixels[k + 1] = pixels[k + 2] = 255;
    pixels[k + 3] = Math.round(255 * Math.max(0, 1 - r) ** 1.5);
  }
  const tex = new THREE.DataTexture(pixels, n, n, THREE.RGBAFormat);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function createNightLighting({ kit, props, missions, tank, driving }) {
  const { THREE, scene, group, box } = kit;
  const sources = [];
  const pools = [];
  function source(x, y, z, { color = warm, range = 12, intensity = 58, radius = 5.2,
    floor = .108, active = () => true, priority = 0, name = 'Area lamp', pool = true } = {}) {
    const item = { x, y, z, color, range, intensity, active, priority, name };
    sources.push(item);
    if (pool) pools.push({ item, radius, floor, active: null });
    return item;
  }
  function fixture(x, y, z, color, name) {
    // Non-colliding wall/marker lamps; physical poles are the existing perimeter fixtures.
    const node = group(name, x, y, z);
    box(node, 0x314357, 0, 0, 0, .36, .24, .22);
    box(node, color, 0, -.015, .13, .25, .14, .045, [], true);
  }

  // Discover the existing floodlight models built by perimeter and decorations.
  scene.traverse(node => {
    if (node.name !== 'Perimeter floodlight') return;
    const { x, z } = node.position, yaw = node.rotation.y;
    // Existing lamps point towards local +Z; a low additive pool is offset in that direction.
    const height = 5.15;
    source(x + Math.sin(yaw) * 2.3, height - 1.25, z + Math.cos(yaw) * 2.3,
      { name: 'Perimeter pool', radius: 6.8, range: 14, intensity: 72 });
  });
  for (const [x, z] of [[2.8, 53], [10.7, 30], [11.2, 15], [10.8, -9], [-29,-20], [-49,-21], [60,20], [60,-18], [-60,20], [-60,-18]]) {
    const pole = group('Night street lamp', x, 0, z);
    box(pole, 0x435362, 0, 2.15, 0, .13, 4.3, .13);
    box(pole, 0x354654, 0, 4.24, .32, .48, .13, .74);
    box(pole, warm, 0, 4.16, .32, .40, .04, .56, [], true);
    kit.solid(pole, 0, 0, .16, .16, 4.3);
    source(x, 3.7, z + .32, { radius: 5.4, range: 12, intensity: 66, name: 'Street lamp' });
  }
  // Bright entrances and work areas. No per-fixture real light allocations.
  for (const [x, z, y, color, name, radius] of [
    [-3.4, fence.south, 3.4, warm, 'South gate', 6],
    [3.4, fence.south, 3.4, warm, 'South gate', 6],
    [headquarters.x, headquarters.z + 12.2, 3.4, warm, 'Headquarters entrance', 7],
    [motorPool.x - 7, motorPool.z + 8, 3.4, warm, 'Motor pool', 6],
    [motorPool.x + 12, motorPool.z + 10, 3.6, warm, 'Repair bay', 6],
    [hospital.x, hospital.z + 7, 2.7, cool, 'Hospital entrance', 6],
    [supplyDepot.x, supplyDepot.z + 9.5, 3.2, warm, 'Supply dock', 6],
    [radarControl.x + 1, radarControl.z + 4.1, 2.6, cool, 'Radar station', 4.5],
    [helipad.x - 7, helipad.z, 2.5, cool, 'Helipad approach', 5.5],
  ]) {
    source(x, y, z, { color, name, radius, range: 13, intensity: 78, priority: 2 });
  }
  // Collectibles use the existing visibility state rather than duplicating mission logic.
  for (const p of [...props.parts, ...props.supplies]) {
    const isSupply = props.supplies.includes(p);
    const floor = isSupply ? .565 : .51;
    const name = p.name ?? 'Medical pickup';
    fixture(p.x, floor + .65, p.z - .65, beacon, name + ' task marker');
    // Marker glow and local light disappear after pickup; the physical lamp stays as scenery.
    const item = source(p.x, floor + 1.6, p.z, { name: 'Objective ' + name, radius: isSupply ? 1.45 : 1.85,
      floor, color: beacon, range: 7, intensity: 24, priority: 5, active: () => p.prop.scale.x > .01 });
    item.marker = true;
  }
  for (const panel of [...props.security, ...props.antennasControls, props.station]) {
    const y = panel.y ?? 0;
    source(panel.x, y + 2.0, panel.z, { name: panel.name + ' console', radius: 1.8,
      floor: y + .108, color: cool, range: 7, intensity: 30, priority: 4 });
  }
  source(repairTank.x - 2.6, 2.1, repairTank.z - .54,
    { name: 'Component installation', radius: 2.3, priority: 4, range: 8, intensity: 34 });
  source(props.hospitalDrop.x, 2.0, props.hospitalDrop.z,
    { name: 'Medical receiving', radius: 2.5, color: cool, priority: 4, range: 8, intensity: 40 });
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5;
    const x = helipad.x + Math.cos(a) * (helipad.radius + .61), z = helipad.z + Math.sin(a) * (helipad.radius + .61);
    // Existing landing-lamp geometry already glows. Only bake a small, shadow-free halo.
    const item = { x, z, color: warm, active: () => true };
    pools.push({ item, radius: 1.15, floor: .107, active: null });
  }

  // A fixed set of lights avoids per-frame shader/light-count changes.
  const local = Array.from({ length: maxLocalLights }, (_, i) => {
    const light = new THREE.PointLight(warm, 0, 12, 2);
    light.name = 'Night local light ' + (i + 1);
    light.castShadow = false; scene.add(light); return light;
  });
  const texture = glowTexture(THREE);
  const glow = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: .36, toneMapped: false }), pools.length + 1);
  glow.name = 'Batched night ground illumination'; glow.frustumCulled = false;
  glow.raycast = () => {}; glow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(glow);
  const transform = new THREE.Object3D(), color = new THREE.Color();
  transform.rotation.x = -Math.PI / 2;
  function writePool(i, x, y, z, rx, rz, yaw, enabled) {
    transform.position.set(x, y, z);
    transform.rotation.set(-Math.PI / 2, 0, yaw, 'YXZ');
    transform.scale.set(enabled ? rx : 0, enabled ? rz : 0, enabled ? 1 : 0);
    transform.updateMatrix();
    glow.setMatrixAt(i, transform.matrix);
  }
  pools.forEach(({ item }, i) => glow.setColorAt(i, color.setHex(item.color)));
  glow.setColorAt(pools.length, color.setHex(0xffe6be));
  const headlamp = { x: 0, y: 2, z: 0, color: 0xffe9c4, range: scoutHeadlights.range, intensity: scoutHeadlights.intensity, name: 'Scout headlights' };
  const candidates = [];
  function update(position) {
    const px = position?.x ?? 0, py = position?.y ?? 1.68, pz = position?.z ?? 0;
    let dirty = false;
    pools.forEach((pool, i) => {
      const enabled = pool.item.active();
      if (pool.active === enabled) return;
      pool.active = enabled;
      writePool(i, pool.item.x, pool.floor, pool.item.z, pool.radius, pool.radius, 0, enabled);
      dirty = true;
    });
    const heading = tank.ground.rotation.y;
    const x = tank.ground.position.x, z = tank.ground.position.z;
    const drive = driving.active;
    const gx = x + Math.sin(heading) * scoutHeadlights.offset, gz = z + Math.cos(heading) * scoutHeadlights.offset;
    // Headlamp ground wash travels with the scout; pool slot reserved while driving.
    writePool(pools.length, gx, .109, gz, scoutHeadlights.width, scoutHeadlights.length, heading, drive);
    glow.instanceMatrix.needsUpdate = dirty || drive || glow.userData.wasDriving !== drive;
    glow.userData.wasDriving = drive;
    candidates.length = 0;
    for (const item of sources) {
      if (!item.active()) continue;
      const distance = Math.hypot(px - item.x, py - item.y, pz - item.z);
      if (distance > item.range + 10) continue;
      item.score = distance - item.priority;
      candidates.push(item);
    }
    candidates.sort((a, b) => a.score - b.score);
    if (drive) {
      headlamp.x = gx; headlamp.z = gz;
      candidates.unshift(headlamp);
    }
    local.forEach((light, i) => {
      const item = candidates[i];
      if (!item) { light.intensity = 0; return; }
      light.position.set(item.x, item.y, item.z);
      light.color.setHex(item.color);
      light.distance = item.range;
      light.intensity = item.intensity;
    });
  }
  return { update, local, glow, sources };
}
