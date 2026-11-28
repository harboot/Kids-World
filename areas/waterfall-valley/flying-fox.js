import { EYE_HEIGHT } from '../../core/player.js';
import { detailKit } from './detail-kit.js';
import { near } from './field-interactions.js';
import { clamp, smooth } from './landform.js';

export function createFlyingFox({ THREE, scene, camera, ground, busy, onLand }) {
  const start = new THREE.Vector3(17, ground(17, -20) + EYE_HEIGHT, -20);
  const end = new THREE.Vector3(11, ground(11, 27) + EYE_HEIGHT, 27);
  const heading = Math.atan2(start.x - end.x, start.z - end.z);
  const landing = { x: end.x, z: end.z, yaw: heading };
  const offset = 0.78;
  const group = new THREE.Group();
  group.name = 'Flying Fox cable and supports';
  scene.add(group);
  const kit = detailKit(THREE, group);
  const cable = p => [p.x, p.y + offset, p.z];
  kit.beam(0x565d66, cable(start), cable(end), 0.067, 0.067, 'cylinder');
  for (const p of [start, end]) {
    const dx = Math.cos(heading) * 1.6, dz = -Math.sin(heading) * 1.6;
    for (const side of [-1, 1]) {
      const x = p.x + dx * side, z = p.z + dz * side;
      kit.beam(0x73543c, [x, ground(x, z) - 0.1, z], [x, p.y + offset + 0.15, z], 0.24);
    }
    kit.beam(0x966f49, [p.x-dx,p.y+offset,p.z-dz], [p.x+dx,p.y+offset,p.z+dz], 0.21);
  }
  kit.finish();

  const trolley = new THREE.Group();
  trolley.name = 'Flying Fox trolley';
  const hardware = detailKit(THREE, trolley);
  hardware.part('cylinder', 0x39454b, 0, 0.04, 0, 0.25, 0.13, 0.25, 0, 0, Math.PI/2);
  hardware.box(0xd5a04c, 0, -0.15, 0, 0.17, 0.26, 0.15);
  hardware.box(0x514336, 0, -0.32, 0, 0.55, 0.075, 0.09);
  hardware.finish();
  scene.add(trolley);

  const from = new THREE.Vector3();
  const position = new THREE.Vector3();
  const orientation = new THREE.Quaternion();
  const forward = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.20, heading, 0, 'YXZ'));
  const takeoff = { x: start.x, y: start.y-EYE_HEIGHT, z: start.z };
  let release, elapsed = 0;

  function reset() {
    release = undefined;
    elapsed = 0;
    trolley.position.set(...cable(start));
    trolley.rotation.y = heading;
  }
  reset();

  return {
    interaction: {
      x: takeoff.x, z: takeoff.z, anchorY: start.y, radius: 1.45, label: 'Ride Flying Fox',
      get active() { return !release && !busy(); },
      reachable(player) { return near(takeoff, player, 1.45); },
      act({ guideCamera }) {
        if (!camera || release || busy() || !near(takeoff, camera.position, 1.45)) return;
        from.copy(camera.position);
        orientation.copy(camera.quaternion);
        elapsed = 0;
        release = guideCamera?.();
      },
    },
    get riding() { return Boolean(release); },
    reset,
    update(dt) {
      if (!release) return;
      elapsed += dt;
      const boarding = smooth(0, 0.45, elapsed);
      const travel = clamp((elapsed - 0.45) / 6);
      position.lerpVectors(start, end, smooth(0, 1, travel));
      camera.position.lerpVectors(from, position, boarding);
      camera.quaternion.slerpQuaternions(orientation, forward, boarding);
      camera.updateMatrixWorld();
      trolley.position.set(...cable(position));
      if (travel < 1) return;
      const stop = release;
      reset();
      stop(landing);
      onLand();
    },
  };
}
