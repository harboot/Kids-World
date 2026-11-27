import { EYE_HEIGHT } from '../../core/player.js';
import { SURFACE_GAP } from '../../core/geometry.js';

export const CABIN = Object.freeze({ x: -7.4, z: 23.7 });
export const FIREPLACE = Object.freeze({ x: CABIN.x - 1.78, z: CABIN.z + 0.94 });
const cue = [
  [55, { duration: 0.15, level: 0.09, wave: 'triangle' }],
  [67, { duration: 0.18, level: 0.08 }, 0.08],
  [76, { duration: 0.24, level: 0.07 }, 0.17],
];

export function createCabin({ THREE, scene, kit, ground, reducedMotion, playCue, notify, onComplete }) {
  const { x, z } = CABIN;
  const { mesh, box, cone, material, block } = kit;
  const group = new THREE.Group();
  group.name = 'Winter Cabin interior';
  scene.add(group);
  let lit = false;
  let time = 0;
  function part(color, px, y, pz, sx, sy, sz, geometry = box) {
    return mesh(geometry, material(color), px, y, pz, sx, sy, sz, false, group);
  }

  // Low floor and a woven rug; the existing terrain stays walkable at the doorway.
  for (let i = 0; i < 11; i++) {
    const px = x - 2.65 + i * 0.53;
    part(i % 2 ? 0xa57247 : 0xb17e51, px, 0.026, z, 0.526, 0.052, 3.85);
  }
  block(x, z, 5.82, 3.85, 0.052);
  part(0x9d4f41, x + 0.45, 0.064 + SURFACE_GAP.detail, z - 0.30, 1.65, 0.025, 2.1);
  for (const side of [-1, 1]) {
    part(0xe6be82, x + 0.45 + side * 0.72, 0.091 + SURFACE_GAP.detail, z - 0.30, 0.06, 0.015, 2.05);
  }

  // Small bench and table remain outside the straight doorway-to-hearth route.
  const bx = x + 2.1, bz = z + 0.85;
  part(0x8b5b39, bx, 0.48, bz, 0.8, 0.13, 1.45);
  part(0xa57047, bx + 0.34, 0.87, bz, 0.13, 0.76, 1.45);
  for (const dz of [-0.53, 0.53]) part(0x634329, bx, 0.25, bz + dz, 0.62, 0.46, 0.13);
  block(bx, bz, 0.8, 1.45, 1.25);
  const tx = x + 2.02, tz = z - 1.08;
  part(0xad7950, tx, 0.82, tz, 0.72, 0.12, 0.75);
  for (const dx of [-0.25, 0.25]) for (const dz of [-0.27, 0.27]) {
    part(0x67462f, tx + dx, 0.40, tz + dz, 0.09, 0.79, 0.09);
  }
  part(0x678e9b, tx, 0.95, tz, 0.15, 0.16, 0.15);
  block(tx, tz, 0.72, 0.75, 0.98);

  // Open stone hearth: the dark recess is surrounded by solid jambs and mantel.
  const fx = FIREPLACE.x, fz = FIREPLACE.z;
  part(0x626568, fx, 0.12, fz, 1.44, 0.14, 1.04);
  part(0x343236, fx, 0.76, fz + 0.31, 1.2, 1.22, 0.18);
  for (const side of [-1, 1]) {
    part(0x77797d, fx + side * 0.58, 0.68, fz, 0.27, 1.12, 0.86);
    for (let i = 0; i < 3; i++) part(0x94989a, fx + side * 0.58, 0.31 + i * 0.33, fz - 0.445, 0.29, 0.29, 0.045);
  }
  part(0x83878a, fx, 1.33, fz, 1.44, 0.24, 0.9);
  part(0x795438, fx, 1.50, fz, 1.65, 0.13, 1.03);
  part(0x77797d, fx, 2.04, fz + 0.07, 0.76, 0.96, 0.68);
  block(fx, fz, 1.48, 1.04, 1.58);
  const logGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.62, 7);
  for (const [dx, dz, yaw] of [[-0.13, -0.08, 0.25], [0.12, 0.08, -0.48], [0, 0.01, 1.10]]) {
    const log = part(0x624129, fx + dx, 0.28, fz + dz, 1, 1, 1, logGeo);
    log.rotation.set(Math.PI / 2, 0, yaw);
  }

  const fire = new THREE.Group();
  fire.name = 'Cabin fire';
  fire.position.set(fx, 0.28, fz - 0.06);
  group.add(fire);
  const outer = new THREE.MeshBasicMaterial({ color: 0xff6f1d });
  const inner = new THREE.MeshBasicMaterial({ color: 0xffcf52 });
  const flames = [];
  for (let i = 0; i < 5; i++) {
    const flame = new THREE.Mesh(cone, i % 2 ? inner : outer);
    const dx = (i - 2) * 0.13;
    flame.position.set(dx, 0.29, i % 2 ? -0.08 : 0.04);
    flame.scale.set(0.16, 0.56, 0.16);
    fire.add(flame);
    flames.push(flame);
  }
  const light = new THREE.PointLight(0xffb35b, 0, 5, 2);
  light.name = 'Cabin warmth';
  light.position.set(fx, 0.98, fz - 0.62);
  group.add(light);

  // Reuse emissive-looking panels for both sides of the decorative windows.
  const windowMaterial = new THREE.MeshBasicMaterial({ color: 0x7599b4 });
  for (const side of [-1, 1]) {
    const wx = x + side * 1.9;
    mesh(box, windowMaterial, wx, 1.52, z - 2.32, 1.04, 0.81, 0.044, false, group);
    part(0x503a2e, wx, 1.52, z - 1.90, 1.28, 1.04, 0.07);
    mesh(box, windowMaterial, wx, 1.52, z - 1.846, 1.04, 0.81, 0.028, false, group);
    part(0x503a2e, wx, 1.52, z - 1.818, 0.07, 0.81, 0.025);
    part(0x503a2e, wx, 1.52, z - 1.802, 1.04, 0.075, 0.025);
  }

  const smoke = new THREE.Group();
  smoke.name = 'Cabin chimney smoke';
  smoke.position.set(fx, 5.06, fz);
  group.add(smoke);
  const smokeGeo = new THREE.DodecahedronGeometry(1, 0);
  const puffs = Array.from({ length: 7 }, () => {
    const puff = new THREE.Mesh(smokeGeo, new THREE.MeshBasicMaterial({
      color: 0xc4d1d8, transparent: true, opacity: 0, depthWrite: false,
    }));
    smoke.add(puff);
    return puff;
  });
  function update(dt) {
    if (!lit) return;
    const still = reducedMotion?.();
    if (!still) time = (time + dt) % 36;
    light.intensity = still ? 11 : 11 + Math.sin(time * 13) * 1.1 + Math.sin(time * 19) * 0.45;
    flames.forEach((flame, i) => {
      const phase = time * 10 + i * 1.9;
      flame.scale.y = still ? 0.56 : 0.48 + 0.14 * Math.sin(phase);
      flame.position.y = flame.scale.y / 2;
      flame.rotation.z = still ? 0 : Math.sin(phase * 0.8) * 0.11;
    });
    puffs.forEach((puff, i) => {
      const age = ((still ? 0 : time / 4.5) + i / puffs.length) % 1;
      puff.position.set(age * 1.45, 0.15 + age * 2.4, age * 0.45);
      puff.scale.setScalar(0.12 + age * 0.39);
      puff.material.opacity = Math.sin(Math.PI * age) * 0.38;
    });
  }
  function reset() {
    lit = false;
    time = 0;
    fire.visible = smoke.visible = false;
    light.intensity = 0;
    windowMaterial.color.setHex(0x7599b4);
  }
  function ignite() {
    if (lit) return false;
    lit = true;
    fire.visible = smoke.visible = true;
    windowMaterial.color.setHex(0xffc76d);
    update(0);
    playCue?.(cue);
    notify?.('Warm Up the Cabin complete!');
    onComplete?.();
    return true;
  }
  reset();
  return {
    get complete() { return lit; },
    interaction: {
      x: fx, z: fz - 0.55, anchorY: 0.85, radius: 1.7, label: 'Light fireplace',
      get active() { return !lit; },
      reachable(eye) {
        return Math.abs(eye.x - x) < 2.82 && eye.z > z - 1.82 && eye.z < z + 1.85 &&
          Math.abs(eye.y - EYE_HEIGHT - ground(eye.x, eye.z)) < 0.3;
      },
      act: ignite,
    },
    update, reset,
  };
}
