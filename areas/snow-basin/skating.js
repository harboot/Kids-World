import { EYE_HEIGHT } from '../../core/player.js';
import { SURFACE_GAP } from '../../core/geometry.js';

export const SKATE_SITE = Object.freeze({ x: -4, z: 8.2 });
export const SKATE_CHECKPOINTS = Object.freeze([
  { x: -2, z: 1 }, { x: -8, z: -4 }, { x: -3, z: -10 },
].map(Object.freeze));
const cue = [[72, { duration: 0.13, level: 0.09 }], [79, { duration: 0.18, level: 0.08 }, 0.1]];

export function createSkating({ THREE, scene, ground, terrain, playCue, notify, onComplete }) {
  let equipped = false;
  let completed = false;
  const visited = new Set();
  const gear = new THREE.Group();
  gear.name = 'Ice skates';
  gear.position.set(SKATE_SITE.x, ground(SKATE_SITE.x, SKATE_SITE.z), SKATE_SITE.z);
  scene.add(gear);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const boot = new THREE.MeshLambertMaterial({ color: 0x304d85 });
  const blade = new THREE.MeshLambertMaterial({ color: 0xc9e9f4 });
  const cuff = new THREE.MeshLambertMaterial({ color: 0xeaf6ff });
  function part(x, y, z, sx, sy, sz, material) {
    const mesh = new THREE.Mesh(box, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    gear.add(mesh);
  }
  for (const x of [-0.17, 0.17]) {
    part(x, 0.15, 0.02, 0.22, 0.19, 0.48, boot);
    part(x, 0.32, -0.10, 0.22, 0.25, 0.23, boot);
    part(x, 0.45, -0.10, 0.24, 0.06, 0.25, cuff);
    part(x, 0.045, 0.02, 0.045, 0.07, 0.53, blade);
  }
  const ring = new THREE.RingGeometry(0.83, 1.05, 24).rotateX(-Math.PI / 2);
  const pending = new THREE.MeshBasicMaterial({ color: 0xffb52e, side: THREE.DoubleSide });
  const reached = new THREE.MeshBasicMaterial({ color: 0x35d38a, side: THREE.DoubleSide });
  const markers = SKATE_CHECKPOINTS.map(({ x, z }, i) => {
    const marker = new THREE.Mesh(ring, pending);
    marker.name = 'Skating checkpoint ' + (i + 1);
    marker.position.set(x, ground(x, z) + SURFACE_GAP.detail * 3, z);
    scene.add(marker);
    return marker;
  });
  function refresh() {
    gear.visible = !equipped;
    markers.forEach((marker, i) => {
      marker.visible = equipped && !completed;
      marker.material = visited.has(i) ? reached : pending;
    });
  }
  function reset() {
    equipped = false;
    completed = false;
    visited.clear();
    refresh();
  }
  function equip() {
    if (equipped) return false;
    equipped = true;
    refresh();
    playCue?.(cue);
    notify?.(completed ? 'Ice skates on! Enjoy the lake.' : 'Ice skates on! Skate through three golden rings.');
    return true;
  }
  function update(eye, grounded) {
    if (!equipped || completed || !eye || !grounded) return;
    if (terrain.getGroundTraction(eye.x, eye.z) >= 1 ||
        Math.abs(eye.y - EYE_HEIGHT - ground(eye.x, eye.z)) > 0.2) return;
    for (const [i, point] of SKATE_CHECKPOINTS.entries()) {
      if (visited.has(i) || Math.hypot(eye.x - point.x, eye.z - point.z) > 1.05) continue;
      visited.add(i);
      if (visited.size === SKATE_CHECKPOINTS.length) {
        completed = true;
        equipped = false;
        refresh();
        notify?.('Ice Skating Challenge complete! Skates returned to the shore.');
        onComplete?.();
      } else {
        refresh();
        playCue?.(cue);
        notify?.('Skating checkpoint ' + visited.size + '/3');
      }
    }
  }
  reset();
  return {
    get equipped() { return equipped; },
    get complete() { return completed; },
    get current() { return visited.size; },
    getGroundTraction(x, z) {
      const normal = terrain.getGroundTraction(x, z);
      return equipped && normal < 1 ? 0.035 : normal;
    },
    interaction: {
      ...SKATE_SITE, radius: 1.9, anchorY: ground(SKATE_SITE.x, SKATE_SITE.z) + 0.45,
      label: 'Put on ice skates', get active() { return !equipped; }, act: equip,
    },
    update, reset,
  };
}
