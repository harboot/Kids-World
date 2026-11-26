import { EYE_HEIGHT } from '../../core/player.js';
import { PLAYER_RADIUS, overlaps } from '../../core/movement.js';

export const tankConfig = Object.freeze({ forward: 15, reverse: 6, acceleration: 10, braking: 14, turn: 1.5 });
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const approach = (n, target, amount) => n + clamp(target - n, -amount, amount);
const wrap = n => Math.atan2(Math.sin(n), Math.cos(n));

function offset(x, z, yaw, u, v) {
  return { x: x + Math.cos(yaw) * u + Math.sin(yaw) * v, z: z - Math.sin(yaw) * u + Math.cos(yaw) * v };
}

// Separating-axis test for two oriented rectangles. Local forward is +Z.
export function rectanglesOverlap(a, b) {
  const ca = Math.cos(a.yaw), sa = Math.sin(a.yaw), cb = Math.cos(b.yaw), sb = Math.sin(b.yaw);
  const dx = b.x - a.x, dz = b.z - a.z;
  for (const [x, z] of [[ca, -sa], [sa, ca], [cb, -sb], [sb, cb]]) {
    const ra = (Math.abs(x * ca - z * sa) * a.width + Math.abs(x * sa + z * ca) * a.depth) / 2;
    const rb = (Math.abs(x * cb - z * sb) * b.width + Math.abs(x * sb + z * cb) * b.depth) / 2;
    if (Math.abs(dx * x + dz * z) >= ra + rb) return false;
  }
  return true;
}

function footprint(x, z, yaw) {
  return [
    { x, z, yaw, width: 3.68, depth: 5.35 },
    { ...offset(x, z, yaw, 0, 3.12), yaw, width: .38, depth: 1.50 },
  ];
}

export function canPlaceTank(x, z, yaw, { obstacles, own, traversal, width, depth }) {
  for (const box of footprint(x, z, yaw)) {
    for (const u of [-box.width / 2, 0, box.width / 2]) {
      for (const v of [-box.depth / 2, 0, box.depth / 2]) {
        const p = offset(box.x, box.z, box.yaw, u, v);
        if (Math.abs(p.x) > width / 2 || Math.abs(p.z) > depth / 2 ||
            Math.abs(traversal.getGroundHeight?.(p.x, p.z, 0) ?? 0) > .18 ||
            traversal.blocksGround?.(p.x, p.z, .15, 0, { x, z }) ||
            (traversal.getCeilingHeight?.(p.x, p.z, 0) ?? Infinity) < 4.5) return false;
      }
    }
    for (const obstacle of obstacles) {
      if (own.has(obstacle) || obstacle.height <= .18) continue;
      const other = obstacle.footprint;
      if (other && rectanglesOverlap(box, other)) return false;
      if (!other && Number.isFinite(obstacle.left) && rectanglesOverlap(box, {
        x: (obstacle.left + obstacle.right) / 2, z: (obstacle.front + obstacle.back) / 2,
        width: obstacle.right - obstacle.left, depth: obstacle.back - obstacle.front, yaw: 0,
      })) return false;
    }
  }
  return true;
}

export function createTankDriving({ THREE, camera, model, obstacles, traversal, width, depth,
  reducedMotion = () => false, playCue = () => {}, notify = () => {} }) {
  const { ground } = model;
  const world = { obstacles, own: new Set(model.ownObstacles), traversal, width, depth };
  const eye = new THREE.Vector3(), target = new THREE.Vector3();
  const startEye = new THREE.Vector3(), startRotation = new THREE.Quaternion();
  const rotation = new THREE.Quaternion(), matrix = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0);
  let release, speed = 0, lookYaw = 0, pitch = -.32, wantedYaw = 0, wantedPitch = -.32, blend = 1, cueTime = 0;
  function local(u, v) { return offset(ground.position.x, ground.position.z, ground.rotation.y, u, v); }
  function exitPosition() {
    for (const distance of [2.35, 2.85, 3.35, 3.85]) {
      for (const [u, v] of [[-distance, -.55], [distance, -.55], [-distance, -1.8], [distance, -1.8], [0, -distance - 1]]) {
        const p = local(u, v);
        if (Math.abs(p.x) > width / 2 - PLAYER_RADIUS || Math.abs(p.z) > depth / 2 - PLAYER_RADIUS) continue;
        const y = traversal.getGroundHeight?.(p.x, p.z, 0) ?? 0;
        if (!Number.isFinite(y) || Math.abs(y) > .18 || traversal.blocksGround?.(p.x, p.z, PLAYER_RADIUS, y, ground.position)) continue;
        if ((traversal.getCeilingHeight?.(p.x, p.z, y) ?? Infinity) < y + EYE_HEIGHT + .14) continue;
        if (obstacles.some(o => o.height > y + .05 && overlaps(o, p.x, p.z))) continue;
        return { ...p, elevation: y, yaw: wrap(ground.rotation.y + Math.PI), pitch: 0 };
      }
    }
    return null;
  }
  function cameraPose(dt) {
    const damping = reducedMotion() ? 1 : 1 - Math.exp(-dt * 10);
    lookYaw += (wantedYaw - lookYaw) * damping; pitch += (wantedPitch - pitch) * damping;
    const p = local(0, -1.46), heading = ground.rotation.y + lookYaw;
    eye.set(p.x, 4.12, p.z);
    target.set(eye.x + Math.sin(heading) * Math.cos(pitch), eye.y + Math.sin(pitch), eye.z + Math.cos(heading) * Math.cos(pitch));
    rotation.setFromRotationMatrix(matrix.lookAt(eye, target, up));
    blend = reducedMotion() ? 1 : Math.min(1, blend + dt / .35);
    const t = blend * blend * (3 - 2 * blend);
    camera.position.lerpVectors(startEye, eye, t);
    camera.quaternion.slerpQuaternions(startRotation, rotation, t);
    camera.updateMatrixWorld();
  }
  function look(dx, dy) {
    wantedYaw = clamp(wantedYaw - dx, -.95, .95);
    wantedPitch = clamp(wantedPitch - dy, -.60, .15);
  }
  function drive(dt, input, pace = 1) {
    if (!release) return;
    const throttle = clamp(-input.y, -1, 1), steer = clamp(-input.x, -1, 1);
    const targetSpeed = throttle * (throttle >= 0 ? tankConfig.forward : tankConfig.reverse) * pace;
    speed = approach(speed, targetSpeed, (Math.abs(targetSpeed) > Math.abs(speed) && speed * targetSpeed >= 0 ? tankConfig.acceleration : tankConfig.braking) * dt);
    const steps = Math.max(1, Math.ceil((Math.abs(speed) * dt + Math.abs(steer) * tankConfig.turn * dt * 4) / .18));
    const step = dt / steps;
    let l = 0, r = 0;
    for (let i = 0; i < steps; i++) {
      let heading = ground.rotation.y;
      let x = ground.position.x, z = ground.position.z;
      const turn = steer * tankConfig.turn * step;
      const nextHeading = wrap(heading + turn);
      if (turn && canPlaceTank(x, z, nextHeading, world)) { heading = nextHeading; l += turn * 1.35; r -= turn * 1.35; }
      const next = offset(x, z, heading, 0, speed * step);
      if (speed && canPlaceTank(next.x, next.z, heading, world)) { x = next.x; z = next.z; l += speed * step; r += speed * step; }
      else if (speed) speed = 0;
      ground.position.x = x; ground.position.z = z; ground.rotation.y = heading;
    }
    model.pose(ground.position.x, ground.position.z, ground.rotation.y, l, r);
    cameraPose(dt);
    cueTime -= dt;
    if (cueTime <= 0) {
      const ratio = Math.min(1, Math.abs(speed) / tankConfig.forward + Math.abs(steer) * .25);
      playCue([[31 + ratio * 13, { duration: .40, level: .055 + ratio * .055, attack: .08, wave: 'triangle' }]]);
      cueTime = .36;
    }
  }
  const exit = { label: 'Exit Tank', silent: true, act() {
    if (!release) return;
    const p = exitPosition();
    if (!p) { speed = 0; notify('No clear space to exit the tank. Move to an open area.'); return; }
    const stop = release; release = undefined; speed = 0;
    playCue([[42, { endPitch: 29, duration: .28, level: .10, wave: 'triangle' }]]);
    stop(p);
  } };
  function board({ guideCamera }) {
    if (release || !guideCamera || !camera) return;
    startEye.copy(camera.position); startRotation.copy(camera.quaternion);
    speed = 0; blend = 0; cueTime = .4; lookYaw = wantedYaw = 0; pitch = wantedPitch = -.32;
    release = guideCamera(look, { drive, prompt: exit });
    if (!release) return;
    playCue([[30, { endPitch: 44, duration: .45, level: .13, wave: 'triangle' }]]);
    cameraPose(0);
  }
  const interactions = [-1, 1].map(side => ({
    label: 'Drive Tank', radius: 1.4, anchorY: 1.4,
    get x() { return local(side * 2.25, -.55).x; },
    get z() { return local(side * 2.25, -.55).z; },
    get active() { return !release; },
    reachable(p) { return Math.abs(p.y - EYE_HEIGHT) < .65; },
    act: board,
  }));
  return { interactions, cancel() { release = undefined; speed = 0; },
    reset() { this.cancel(); model.reset(); }, get active() { return Boolean(release); } };
}
