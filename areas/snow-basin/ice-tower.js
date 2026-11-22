const turn = Math.PI * 2;
const startAngle = -Math.PI / 2;
const inner = 2.02;
const outer = 4.62;
const treadAngle = turn / 36;
const risingTreads = 78;
const treadCount = 85;
const treadHeight = 0.16;
const footingTolerance = 0.23;

export const ICE_TOWER = Object.freeze({
  x: 20, z: 4, deckHeight: risingTreads * treadHeight, stairEnd: treadCount,
});

export function towerStairPoint(tread, radius = (inner + outer) / 2, y = Math.min(tread, risingTreads) * treadHeight) {
  const angle = startAngle + tread * treadAngle;
  return { x: ICE_TOWER.x + Math.sin(angle) * radius, y, z: ICE_TOWER.z + Math.cos(angle) * radius };
}

export function addIceTower(THREE, scene, { mesh, material, cone }) {
  const { x, z, deckHeight } = ICE_TOWER;
  const group = new THREE.Group();
  group.name = 'Ice Tower';
  scene.add(group);

  const column = new THREE.CylinderGeometry(2.13, 2.24, 1, 12);
  const columnHeight = deckHeight + 0.67;
  mesh(column, material(0x5aa6c8), x, columnHeight / 2 - 0.035, z, 1, columnHeight, 1, false, group);
  const collar = new THREE.CylinderGeometry(2.32, 2.15, 1, 12);
  mesh(collar, material(0xaee5f2), x, deckHeight + 0.28, z, 1, 0.54, 1, false, group);
  mesh(cone, material(0xe3f6fc), x, deckHeight + 1.25, z, 1.28, 1.5, 1.28, false, group);

  const positions = [];
  const colors = [];
  const frost = new THREE.Color(0xc5ebf6);
  const ice = new THREE.Color(0x9cd4ea);
  const shade = new THREE.Color(0x5c99b8);
  const trim = new THREE.Color(0xdff6fa);

  function quad(a, b, c, d, color) {
    for (const { x, y, z } of [a, b, c, a, c, d]) {
      positions.push(x, y, z);
      colors.push(color.r, color.g, color.b);
    }
  }

  for (let i = 0; i < treadCount; i++) {
    const top = Math.min(i + 0.5, risingTreads) * treadHeight;
    const previous = Math.max(0, Math.min(i - 0.5, risingTreads) * treadHeight);
    const p = (tread, radius, height) => towerStairPoint(tread, radius, height);
    quad(p(i, inner, top), p(i, outer, top), p(i + 1, outer, top), p(i + 1, inner, top), i >= risingTreads ? frost : ice);
    if (top > previous) {
      quad(p(i, outer, previous), p(i, outer, top), p(i, inner, top), p(i, inner, previous), frost);
    }
    quad(p(i, outer, top - 0.23), p(i + 1, outer, top - 0.23), p(i + 1, outer, top), p(i, outer, top), shade);
    quad(p(i, inner, top - 0.23), p(i + 1, inner, top - 0.23),
      p(i + 1, outer, top - 0.23), p(i, outer, top - 0.23), shade);

    if (i < 2) continue;
    const start = Math.min(i, risingTreads) * treadHeight;
    const end = Math.min(i + 1, risingTreads) * treadHeight;
    const railInner = outer - 0.19;
    const railHeight = 0.58;
    quad(p(i, outer, top), p(i + 1, outer, top),
      p(i + 1, outer, end + railHeight), p(i, outer, start + railHeight), shade);
    quad(p(i, railInner, start + 0.09), p(i, railInner, start + railHeight),
      p(i + 1, railInner, end + railHeight), p(i + 1, railInner, end + 0.09), ice);
    quad(p(i, railInner, start + railHeight), p(i, outer, start + railHeight),
      p(i + 1, outer, end + railHeight), p(i + 1, railInner, end + railHeight), trim);
  }

  // Close the lookout with a rail across the upper end of the spiral.
  const end = (radius, dy) => towerStairPoint(treadCount, radius, deckHeight + dy);
  quad(end(outer, -0.23), end(inner, -0.23), end(inner, 0.58), end(outer, 0.58), shade);
  const inside = (radius, dy) => towerStairPoint(treadCount - 0.35, radius, deckHeight + dy);
  quad(inside(inner, 0), inside(outer, 0), inside(outer, 0.58), inside(inner, 0.58), ice);
  quad(inside(inner, 0.58), inside(outer, 0.58), end(outer, 0.58), end(inner, 0.58), trim);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const stairs = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }));
  stairs.name = 'Ice Tower spiral stairs';
  stairs.receiveShadow = true;
  group.add(stairs);

  function surface(px, pz, feet = 0) {
    const dx = px - x;
    const dz = pz - z;
    const radiusSquared = dx * dx + dz * dz;
    if (radiusSquared < inner * inner || radiusSquared > outer * outer) return null;
    let tread = ((Math.atan2(dx, dz) - startAngle + turn) % turn) / treadAngle;
    let floor = null;
    // The same angle can cross multiple flights. Select the highest one within stepping range.
    for (; tread <= treadCount; tread += 36) {
      const height = Math.min(tread, risingTreads) * treadHeight;
      if (height > feet + footingTolerance) break;
      floor = height;
    }
    return floor;
  }

  function blocksGround(px, pz, radius, feet, from) {
    const distance = Math.hypot(px - x, pz - z);
    if (distance < inner + radius && (feet ?? 0) < columnHeight) return true;
    if (!from) return false;
    const previous = surface(from.x, from.z, feet);
    if (previous === null || previous <= 2 * treadHeight || feet - previous > 1.8) return false;
    const next = surface(px, pz, feet);
    return distance > outer - 0.19 - radius || next === null || previous - next > footingTolerance;
  }

  return { surface, blocksGround };
}
