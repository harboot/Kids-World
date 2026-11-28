import { EYE_HEIGHT } from '../../core/player.js';
import { PLAYER_RADIUS, overlaps } from '../../core/movement.js';
import { clamp } from './landform.js';

export function localPoint(x, z, yaw, side, forward) {
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  return { x: x + side * cos + forward * sin, z: z - side * sin + forward * cos };
}

export function hitsBody(x, z, radius, body) {
  const p = localPoint(0, 0, -body.yaw, x - body.x, z - body.z);
  const dx = Math.max(0, Math.abs(p.x) - body.width / 2);
  const dz = Math.max(0, Math.abs(p.z) - body.length / 2);
  return Math.hypot(dx, dz) < radius;
}

export function safeStand(world, x, z, expected, maxRise = 0.8) {
  const y = world.getGroundHeight(x, z, expected);
  if (!Number.isFinite(y) || Math.abs(y - expected) > maxRise ||
      world.getCeilingHeight(x, z, y) < y + EYE_HEIGHT + 0.14 ||
      world.blocksGround(x, z, PLAYER_RADIUS, y, { x, z }) ||
      world.obstacles.some(obstacle => obstacle.height > y + 0.21 && overlaps(obstacle, x, z))) return null;
  for (const [dx, dz] of [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) {
    if (Math.abs(world.getGroundHeight(x + dx, z + dz, y) - y) > 0.24) return null;
  }
  return { x, z, elevation: y };
}

export function approach(value, target, amount) {
  return value + clamp(target - value, -amount, amount);
}

// The valley vehicles use the core guideCamera driving and pinned interaction
// lifecycle. Rail and water constraints remain with the vehicles.
export function createRide({ THREE, camera, label, reducedMotion, advance, driverPose, findExit, notify, onBoard }) {
  const from = new THREE.Vector3(), eye = new THREE.Vector3(), target = new THREE.Vector3();
  const fromRotation = new THREE.Quaternion(), rotation = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0), view = new THREE.Matrix4();
  let release, leaving = false, blend, yaw, pitch, wantedYaw, wantedPitch;

  function look(dx, dy) {
    wantedYaw = clamp(wantedYaw - dx, -2.25, 2.25);
    wantedPitch = clamp(wantedPitch - dy, -0.78, 0.42);
  }

  function poseCamera(dt) {
    const pose = driverPose();
    const damping = reducedMotion() ? 1 : 1 - Math.exp(-dt * 13);
    yaw += (wantedYaw - yaw) * damping;
    pitch += (wantedPitch - pitch) * damping;
    const heading = pose.yaw + yaw;
    eye.set(pose.x, pose.y, pose.z);
    target.set(eye.x + Math.sin(heading) * Math.cos(pitch), eye.y + Math.sin(pitch),
      eye.z + Math.cos(heading) * Math.cos(pitch));
    rotation.setFromRotationMatrix(view.lookAt(eye, target, up));
    blend = reducedMotion() ? 1 : Math.min(1, blend + dt / 0.24);
    const t = blend * blend * (3 - 2 * blend);
    camera.position.lerpVectors(from, eye, t);
    camera.quaternion.slerpQuaternions(fromRotation, rotation, t);
    camera.updateMatrixWorld();
  }

  function tryExit() {
    const place = findExit();
    leaving = false;
    if (!place) {
      notify(label === 'Boat' ? 'Head closer to a shallow shore to exit the boat.' : 'Move a short distance to clear the side of the train.');
      return;
    }
    const stop = release;
    release = undefined;
    stop(place);
  }

  function drive(dt, input, pace) {
    if (!release) return;
    const stopped = advance(dt, leaving ? 0 : -input.y, leaving ? 0 : input.x, pace, leaving);
    if (leaving && stopped) tryExit();
    if (release) poseCamera(dt);
  }

  const prompt = { label: 'Exit ' + label, silent: true, act() {
    if (!release) return;
    leaving = true;
    if (advance(0, 0, 0, 1, true)) tryExit();
  } };

  return {
    get active() { return Boolean(release); },
    board({ guideCamera }) {
      if (release || !camera || !guideCamera) return;
      from.copy(camera.position);
      fromRotation.copy(camera.quaternion);
      yaw = wantedYaw = 0;
      pitch = wantedPitch = -0.12;
      blend = 0;
      leaving = false;
      release = guideCamera(look, { drive, prompt });
      if (release) {
        onBoard?.();
        poseCamera(0);
      }
    },
    cancel() {
      release = undefined;
      leaving = false;
    },
  };
}
