import { EYE_HEIGHT } from './player.js';
import { PLAYER_RADIUS, overlaps } from './movement.js';
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

function footprint(x, z, yaw, dimensions) {
  return [{ x, z, yaw, width: dimensions.width, depth: dimensions.depth },
    ...(dimensions.extraFootprints ?? []).map(p => ({ ...offset(x,z,yaw,p.x ?? 0,p.z ?? 0), yaw, width:p.width, depth:p.depth }))];
}

export function canPlaceVehicle(x, z, yaw, { obstacles, own, traversal, width, depth }, dimensions) {
  for (const box of footprint(x, z, yaw, dimensions)) {
    for (const u of [-box.width / 2, 0, box.width / 2]) {
      for (const v of [-box.depth / 2, 0, box.depth / 2]) {
        const p = offset(box.x, box.z, box.yaw, u, v);
        if (Math.abs(p.x) > width / 2 || Math.abs(p.z) > depth / 2 ||
            Math.abs(traversal.getGroundHeight?.(p.x, p.z, 0) ?? 0) > .18 ||
            traversal.blocksGround?.(p.x, p.z, .15, 0, { x, z }) ||
            (traversal.getCeilingHeight?.(p.x, p.z, 0) ?? Infinity) < dimensions.eyeHeight + .25) return false;
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

export function createVehicleDriving({ THREE, camera, model, obstacles, traversal, width, depth, dimensions, config, label, canBoard = () => true,
  reducedMotion = () => false, playCue = () => {}, notify = () => {} }) {
  const { ground } = model;
  const world = { obstacles, own: new Set(model.ownObstacles), traversal, width, depth };
  const eye = new THREE.Vector3(), target = new THREE.Vector3();
  const startEye = new THREE.Vector3(), startRotation = new THREE.Quaternion();
  const rotation = new THREE.Quaternion(), matrix = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0);
  const initialPitch = dimensions.pitch ?? -.32;
  let release, speed = 0, lookYaw = 0, pitch = initialPitch, wantedYaw = 0, wantedPitch = initialPitch, blend = 1, cueTime = 0;
  function local(u, v) { return offset(ground.position.x, ground.position.z, ground.rotation.y, u, v); }
  function exitPosition() {
    for (const distance of [dimensions.boardX + .10, 2.15, 2.65, 3.15]) {
      for (const [u, v] of [[-distance, dimensions.boardZ], [distance, dimensions.boardZ], [-distance, -1.25], [distance, -1.25], [0, -Math.max(2.15, distance)]]) {
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
    const p = local(dimensions.seatX ?? 0, dimensions.seatZ), heading = ground.rotation.y + lookYaw;
    eye.set(p.x, dimensions.eyeHeight, p.z);
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
    const targetSpeed = throttle * (throttle >= 0 ? config.forward : config.reverse) * pace;
    speed = approach(speed, targetSpeed, (Math.abs(targetSpeed) > Math.abs(speed) && speed * targetSpeed >= 0 ? config.acceleration : config.braking) * dt);
    const steps = Math.max(1, Math.ceil((Math.abs(speed) * dt + Math.abs(steer) * config.turn * dt * 2.6) / .18));
    const step = dt / steps;
    let l = 0, r = 0;
    for (let i = 0; i < steps; i++) {
      let heading = ground.rotation.y;
      let x = ground.position.x, z = ground.position.z;
      const turn = steer * config.turn * step;
      const nextHeading = wrap(heading + turn);
      if (turn && canPlaceVehicle(x, z, nextHeading, world, dimensions)) { heading = nextHeading; l += turn * dimensions.trackOffset; r -= turn * dimensions.trackOffset; }
      const next = offset(x, z, heading, 0, speed * step);
      if (speed && canPlaceVehicle(next.x, next.z, heading, world, dimensions)) { x = next.x; z = next.z; l += speed * step; r += speed * step; }
      else if (speed) speed = 0;
      ground.position.x = x; ground.position.z = z; ground.rotation.y = heading;
    }
    model.pose(ground.position.x, ground.position.z, ground.rotation.y, l, r, throttle, steer);
    cameraPose(dt);
    cueTime -= dt;
    if (cueTime <= 0) {
      const ratio = Math.min(1, Math.abs(speed) / config.forward + Math.abs(steer) * .25);
      playCue([[31 + ratio * 13, { duration: .40, level: .055 + ratio * .055, attack: .08, wave: 'triangle' }]]);
      cueTime = .36;
    }
  }
  const exit = { label: 'Exit ' + label, silent: true, act() {
    if (!release) return;
    const p = exitPosition();
    if (!p) { speed = 0; notify('No clear space to exit the ' + label.toLowerCase() + '. Move to an open area.'); return; }
    const stop = release; release = undefined; speed = 0;
    model.pose(ground.position.x, ground.position.z, ground.rotation.y);
    playCue([[42, { endPitch: 29, duration: .28, level: .10, wave: 'triangle' }]]);
    stop(p);
  } };
  function board({ guideCamera }) {
    if (release || !canBoard() || !guideCamera || !camera) return;
    startEye.copy(camera.position); startRotation.copy(camera.quaternion);
    speed = 0; blend = 0; cueTime = .4; lookYaw = wantedYaw = 0; pitch = wantedPitch = initialPitch;
    release = guideCamera(look, { drive, prompt: exit });
    if (!release) return;
    playCue([[30, { endPitch: 44, duration: .45, level: .13, wave: 'triangle' }]]);
    cameraPose(0);
  }
  const interactions = [-1, 1].map(side => ({
    label: 'Drive ' + label, radius: 1.25, anchorY: 1.25,
    get x() { return local(side * dimensions.boardX, dimensions.boardZ).x; },
    get z() { return local(side * dimensions.boardX, dimensions.boardZ).z; },
    get active() { return !release && canBoard(); },
    reachable(p) { return Math.abs(p.y - EYE_HEIGHT) < .65; },
    act: board,
  }));
  return { interactions, cancel() { release = undefined; speed = 0; },
    reset() { this.cancel(); model.reset(); }, get active() { return Boolean(release); }, get position() { return ground.position; } };
}
