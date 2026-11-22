import { EYE_HEIGHT } from '../../core/player.js';
import { SLIDE_LANDING, SLIDE_PATH, SLIDE_PLATFORM, SLIDE_START } from './slide.js';

const seatedEye = 0.94;
const normal = { enter: 0.62, slide: 5.15, stand: 0.6 };
const gentle = { enter: 0.48, slide: 3.15, stand: 0.45 };
const slideCue = [
  [65, { endPitch: 48, duration: 1.12, attack: 0.27, level: 0.085, wave: 'triangle' }],
  [77, { endPitch: 60, duration: 0.75, attack: 0.19, level: 0.035 }, 0.2],
];

const distances = [0];
for (let i = 1; i < SLIDE_PATH.length; i++) {
  const a = SLIDE_PATH[i - 1];
  const b = SLIDE_PATH[i];
  distances.push(distances[i - 1] + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
}
const pathLength = distances.at(-1);

function sample(distance, position) {
  let lo = 0;
  let hi = distances.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (distances[mid] <= distance) lo = mid;
    else hi = mid;
  }
  const a = SLIDE_PATH[lo];
  const b = SLIDE_PATH[hi];
  const t = (distance - distances[lo]) / (distances[hi] - distances[lo]);
  return position.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
}

const ease = t => t * t * (3 - 2 * t);

export function createSlideRide({ THREE, camera, gate, ground, signal, isPlayerGrounded = () => true,
  reducedMotion = () => false, playCue, onLanding }) {
  const entryEye = new THREE.Vector3();
  const entryRotation = new THREE.Quaternion();
  const rideEye = new THREE.Vector3();
  const rideRotation = new THREE.Quaternion();
  const angles = new THREE.Euler(0, 0, 0, 'YXZ');
  const before = new THREE.Vector3();
  const after = new THREE.Vector3();
  const landingEye = new THREE.Vector3(SLIDE_LANDING.x, ground(SLIDE_LANDING.x, SLIDE_LANDING.z) + EYE_HEIGHT, SLIDE_LANDING.z);
  sample(pathLength - 0.7, before);
  const landing = {
    x: SLIDE_LANDING.x, z: SLIDE_LANDING.z,
    yaw: Math.atan2(before.x - SLIDE_LANDING.x, before.z - SLIDE_LANDING.z),
  };
  const entry = { x: 0, z: 0, yaw: 0 };
  let release = null;
  let time = 0;
  let timing = normal;
  let completed = false;

  function pose(distance, progress, steady) {
    sample(distance, rideEye);
    // Look across several segments while the eye follows their exact centerline.
    sample(Math.max(0, distance - 0.7), before);
    sample(Math.min(pathLength, distance + 1.25), after);
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const dz = after.z - before.z;
    const motion = steady ? 0 : Math.sin(Math.PI * progress) ** 2;
    rideEye.y += seatedEye + Math.sin(time * 10) * motion * 0.024;
    angles.set(Math.atan2(dy, Math.hypot(dx, dz)) * (steady ? 0.48 : 0.78),
      Math.atan2(-dx, -dz), Math.sin(progress * Math.PI * 4) * motion * 0.031, 'YXZ');
    rideRotation.setFromEuler(angles);
  }

  function reachable(eye) {
    if (!eye || !isPlayerGrounded() ||
        Math.abs(eye.x - SLIDE_PLATFORM.x) > SLIDE_PLATFORM.length / 2 - 0.63 ||
        Math.abs(eye.z - SLIDE_PLATFORM.z) > SLIDE_PLATFORM.width / 2 - 0.51) return false;
    const floor = ground(eye.x, eye.z);
    return Math.abs(floor - SLIDE_START.y) < 0.13 && Math.abs(eye.y - floor - EYE_HEIGHT) < 0.09;
  }

  function stop(spawn) {
    const restore = release;
    release = null;
    gate.visible = true;
    restore?.(spawn);
  }

  const interaction = {
    x: SLIDE_PLATFORM.x, z: SLIDE_PLATFORM.z, anchorY: SLIDE_START.y + 1.05,
    label: 'Slide Down', radius: 1.7, silent: true,
    get active() { return !release && !signal?.aborted; },
    reachable,
    act({ guideCamera } = {}) {
      if (!interaction.active || !reachable(camera?.position) || typeof guideCamera !== 'function') return false;
      entryEye.copy(camera.position);
      entryRotation.copy(camera.quaternion);
      angles.setFromQuaternion(entryRotation, 'YXZ');
      Object.assign(entry, { x: entryEye.x, z: entryEye.z, yaw: angles.y });
      const restore = guideCamera();
      if (typeof restore !== 'function') return false;
      release = restore;
      time = 0;
      timing = reducedMotion() ? gentle : normal;
      gate.visible = false;
      playCue?.(slideCue);
      return true;
    },
  };

  function update(dt) {
    if (!release) return;
    if (signal?.aborted) {
      stop(entry);
      return;
    }
    const { enter, slide, stand } = timing;
    const standStart = enter + slide;
    const duration = standStart + stand;
    time = Math.min(duration, time + dt);
    const steady = timing === gentle || reducedMotion();
    if (time < enter) {
      const t = ease(time / enter);
      pose(0, 0, steady);
      camera.position.lerpVectors(entryEye, rideEye, t);
      camera.quaternion.slerpQuaternions(entryRotation, rideRotation, t);
      if (steady) {
        angles.setFromQuaternion(camera.quaternion, 'YXZ');
        camera.rotation.set(angles.x, angles.y, 0, 'YXZ');
      }
    } else if (time < standStart) {
      const progress = (time - enter) / slide;
      pose(pathLength * ease(progress), progress, steady);
      camera.position.copy(rideEye);
      camera.quaternion.copy(rideRotation);
    } else {
      const t = ease((time - standStart) / stand);
      pose(pathLength, 1, steady);
      camera.position.lerpVectors(rideEye, landingEye, t);
      camera.rotation.set(angles.x * (1 - t), landing.yaw, 0, 'YXZ');
    }
    camera.updateMatrixWorld();
    if (time < duration) return;
    stop(landing);
    if (!completed) {
      completed = true;
      onLanding();
    }
  }

  return {
    interaction, update,
    get riding() { return release !== null; },
    get completed() { return completed; },
    cancel() { stop(entry); },
    reset() {
      stop(entry);
      completed = false;
    },
  };
}
