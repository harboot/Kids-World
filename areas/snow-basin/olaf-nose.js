import { EYE_HEIGHT } from '../../core/player.js';
import { SURFACE_GAP } from '../../core/geometry.js';

export const CARROT_SITE = Object.freeze({ x: 21, z: -17 });

export function createOlafNose({ THREE, scene, kit, ground, characters, reducedMotion, playCue, notify, onComplete }) {
  const { x, z } = CARROT_SITE;
  const y = ground(x, z);
  const { cone, material } = kit;
  const model = new THREE.Group();
  model.name = 'Olaf glowing carrot';
  model.position.set(x, y + 0.45, z);
  scene.add(model);
  const root = new THREE.Mesh(cone, new THREE.MeshBasicMaterial({ color: 0xff8a23 }));
  root.scale.set(0.17, 0.68, 0.17);
  root.rotation.z = Math.PI;
  model.add(root);
  for (const side of [-1, 0, 1]) {
    const leaf = new THREE.Mesh(cone, material(0x519946));
    leaf.scale.set(0.075, 0.25, 0.075);
    leaf.position.set(side * 0.07, 0.37, 0);
    leaf.rotation.z = -side * 0.38;
    model.add(leaf);
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffd65c, side: THREE.DoubleSide }));
  ring.name = 'Olaf carrot beacon';
  ring.position.set(x, y + SURFACE_GAP.detail * 2, z);
  // Follow the hillside rather than leaving the marker buried or floating.
  const points = ring.geometry.getAttribute('position');
  for (let i = 0; i < points.count; i++) {
    points.setY(i, ground(x + points.getX(i), z + points.getZ(i)) - y);
  }
  scene.add(ring);
  const glow = new THREE.PointLight(0xffa12c, 2.5, 4, 2);
  glow.position.y = 0.3;
  model.add(glow);
  let carrying = false, complete = false, time = 0;
  const olaf = characters.olaf.position;
  function reset() {
    carrying = complete = false;
    time = 0;
    model.visible = ring.visible = true;
    model.position.y = y + 0.45;
    model.rotation.y = 0;
  }
  function pickup() {
    if (carrying || complete) return false;
    carrying = true;
    model.visible = ring.visible = false;
    notify?.('Found the carrot! Bring it back to Olaf.');
    playCue?.([[76, { duration: 0.17, level: 0.09 }]]);
    return true;
  }
  function give() {
    if (!carrying || complete) return false;
    if (!characters.restoreNose()) return false;
    carrying = false;
    complete = true;
    notify?.("Olaf's Missing Nose complete!");
    onComplete?.();
    return true;
  }
  reset();
  return {
    get carrying() { return carrying; },
    get complete() { return complete; },
    interactions: [
      { x, z, anchorY: y + 0.55, radius: 2, label: 'Pick up carrot',
        get active() { return !carrying && !complete; },
        reachable(eye) { return Math.abs(eye.y - EYE_HEIGHT - ground(eye.x, eye.z)) < 0.5; },
        act: pickup },
      { x: olaf.x, z: olaf.z, anchorY: olaf.y + 1.25, radius: 2.4, label: 'Return carrot',
        get active() { return carrying && !complete; },
        reachable(eye) { return Math.abs(eye.y - EYE_HEIGHT - olaf.y) < 1; },
        act: give },
    ],
    update(dt) {
      if (!model.visible || reducedMotion?.()) return;
      time = (time + dt) % 600;
      model.position.y = y + 0.45 + 0.12 * Math.sin(time * 3);
      model.rotation.y = time * 1.4;
      glow.intensity = 2.5 + 0.5 * Math.sin(time * 4);
    },
    reset,
  };
}
