import { EYE_HEIGHT } from '../../core/player.js';
import { passengerDoor, passengerEye, parkedHeading } from './helicopter.js';
import { helipad } from './layout.js';

export const cruiseAltitude = 22.6;
export const flightDurations = Object.freeze({
  boarding: 2.45, startup: 3.25, takeoff: 8.4, patrol: 52, returning: 9,
  landing: 8.1, landed: 2.6, disembarking: 2.55,
});
const phases = Object.keys(flightDurations);
const circuitTime = flightDurations.patrol + flightDurations.returning;
const speedRamp = 4.5;
const centerX = 3.5;
const centerZ = 11.5;
const radiusX = 59.5;
const rounding = .36;
const padX = (helipad.x - centerX) / radiusX;
let padCosine = padX;
for (let i = 0; i < 12; i++) padCosine = padX / (1 + rounding * (1 - padCosine ** 2));
const padSine = -Math.sqrt(1 - padCosine ** 2);
const radiusZ = (helipad.z - centerZ) / (padSine * (1 + rounding * padCosine ** 2));
const firstAngle = Math.atan2(padSine, padCosine);
const turn = 2 * Math.PI;
const smooth = t => t * t * (3 - 2 * t);
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const angleDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

// Screen north is -Z in Drone View, so +Z is down on the map. Starting at
// the eastern extreme, the +Z tangent points south and the interior is right.
const segments = 512;
const distances = [0];
for (let i = 1; i <= segments; i++) {
  const angle = firstAngle + (i - .5) * turn / segments;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const dx = -radiusX * sin * (1 + rounding - 3 * rounding * cos ** 2);
  const dz = radiusZ * cos * (1 + rounding - 3 * rounding * sin ** 2);
  distances.push(distances[i - 1] + Math.hypot(dx, dz) * turn / segments);
}

export function sampleCircuit(progress, out = {}) {
  const length = distances[segments] * clamp(progress, 0, 1);
  let lo = 0;
  let hi = segments;
  while (hi - lo > 1) {
    const middle = (hi + lo) >> 1;
    if (distances[middle] <= length) lo = middle;
    else hi = middle;
  }
  const fraction = (length - distances[lo]) / (distances[hi] - distances[lo]);
  const angle = firstAngle + (lo + fraction) * turn / segments;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const horizontal = 1 + rounding - 3 * rounding * cos ** 2;
  const vertical = 1 + rounding - 3 * rounding * sin ** 2;
  const dx = -radiusX * sin * horizontal;
  const dz = radiusZ * cos * vertical;
  const ddx = -radiusX * cos * (horizontal + 6 * rounding * sin ** 2);
  const ddz = -radiusZ * sin * (vertical + 6 * rounding * cos ** 2);
  const speed = Math.hypot(dx, dz);
  out.x = progress <= 0 || progress >= 1 ? helipad.x : centerX + radiusX * cos * (1 + rounding * sin ** 2);
  out.z = progress <= 0 || progress >= 1 ? helipad.z : centerZ + radiusZ * sin * (1 + rounding * cos ** 2);
  out.dx = dx / speed;
  out.dz = dz / speed;
  out.yaw = Math.atan2(dx, dz);
  out.curvature = (dx * ddz - dz * ddx) / speed ** 3;
  return out;
}

function circuitDistance(time) {
  const burnIn = t => {
    const u = t / speedRamp;
    return speedRamp * (u ** 3 - .5 * u ** 4);
  };
  const effectiveTime = circuitTime - speedRamp;
  if (time < speedRamp) return burnIn(time) / effectiveTime;
  if (time > circuitTime - speedRamp) return 1 - burnIn(circuitTime - time) / effectiveTime;
  return (time - speedRamp * .5) / effectiveTime;
}

const startupCue = [
  [32, { endPitch: 43, duration: 2.35, level: .14, attack: .7, wave: 'triangle' }],
  [43, { endPitch: 49, duration: 1.7, level: .073, attack: .5 }, .63],
];
const touchdownCue = [[43, { endPitch: 34, duration: 1.5, level: .09, attack: .16, wave: 'triangle' }]];

export function createHelicopterFlight({ THREE, camera, model, reducedMotion, playCue, onLanding }) {
  const { aircraft, standing } = model;
  const position = new THREE.Vector3();
  const startPosition = new THREE.Vector3();
  const startRotation = new THREE.Quaternion();
  const exitRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), standing.yaw);
  const orientation = new THREE.Matrix4();
  const airRotation = new THREE.Quaternion();
  const cabinRotation = new THREE.Quaternion();
  const up = new THREE.Vector3();
  const target = new THREE.Vector3();
  const local = new THREE.Vector3();
  const windowPoint = aircraft.localToWorld(new THREE.Vector3(...passengerDoor));
  const standEye = new THREE.Vector3(standing.x, EYE_HEIGHT, standing.z);
  const tangentAtPad = sampleCircuit(0).yaw;
  const path = {};
  let state = 'idle';
  let phaseTime = 0;
  let flightTime = 0;
  let mainRotor = .16;
  let rotorSpeed = .63;
  let release;
  let manualLook = false;
  let yaw = 0, pitch = 0, wantedYaw = 0, wantedPitch = 0;

  function look(dx, dy) {
    if ((!dx && !dy) || state === 'boarding' || state === 'disembarking') return;
    if (!manualLook) {
      wantedYaw = yaw;
      wantedPitch = pitch;
      manualLook = true;
    }
    wantedYaw = clamp(wantedYaw + dx, -1.48, 1.48);
    wantedPitch = clamp(wantedPitch - dy, -.66, .34);
  }

  function poseCamera(dt, ratio, steady) {
    aircraft.getWorldQuaternion(airRotation);
    position.fromArray(passengerEye).applyMatrix4(aircraft.matrixWorld);
    const sightseeing = state === 'takeoff' ? smooth(ratio)
      : state === 'patrol' || state === 'returning' ? 1
        : state === 'landing' ? 1 - smooth(ratio) : 0;
    if (!manualLook) {
      const view = steady ? 1 : sightseeing;
      wantedYaw = -1.09 + 2.33 * view;
      wantedPitch = -.13 - .34 * view;
    }
    const damping = 1 - Math.exp(-dt * 5.4);
    yaw += (wantedYaw - yaw) * damping;
    pitch += (wantedPitch - pitch) * damping;
    up.set(0, 1, 0).applyQuaternion(airRotation);
    target.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    target.applyQuaternion(airRotation).add(position);
    cabinRotation.setFromRotationMatrix(orientation.lookAt(position, target, up));
    if (state === 'boarding') {
      if (ratio < .52) camera.position.lerpVectors(startPosition, windowPoint, smooth(ratio / .52));
      else camera.position.lerpVectors(windowPoint, position, smooth((ratio - .52) / .48));
      camera.quaternion.slerpQuaternions(startRotation, cabinRotation, smooth(ratio));
    } else if (state === 'disembarking') {
      if (ratio < .55) camera.position.lerpVectors(position, windowPoint, smooth(ratio / .55));
      else camera.position.lerpVectors(windowPoint, standEye, smooth((ratio - .55) / .45));
      camera.quaternion.slerpQuaternions(cabinRotation, exitRotation, smooth(ratio));
    } else {
      camera.position.copy(position);
      camera.quaternion.copy(cabinRotation);
    }
    camera.updateMatrixWorld();
  }

  function pose(dt) {
    const ratio = flightDurations[state] ? phaseTime / flightDurations[state] : 0;
    const steady = reducedMotion();
    const idleSpeed = steady ? 0 : .63;
    const highSpeed = steady ? 9.2 : 15.6;
    let x = helipad.x, y = 0, z = helipad.z, heading = parkedHeading, bank = 0, tilt = 0, door = 0;
    let speed = idleSpeed;
    if (state === 'boarding') {
      door = 1.32 * smooth(clamp(ratio / .30, 0, 1)) * smooth(clamp((1 - ratio) / .22, 0, 1));
    } else if (state === 'startup') {
      speed = idleSpeed + (highSpeed - idleSpeed) * smooth(ratio);
    } else if (state === 'takeoff') {
      y = cruiseAltitude * smooth(ratio);
      heading += angleDelta(heading, tangentAtPad) * smooth(ratio);
      speed = highSpeed;
    } else if (state === 'patrol' || state === 'returning') {
      const time = state === 'patrol' ? phaseTime : flightDurations.patrol + phaseTime;
      sampleCircuit(circuitDistance(time), path);
      x = path.x;
      z = path.z;
      y = cruiseAltitude;
      heading = path.yaw;
      const pace = smooth(clamp(Math.min(time, circuitTime - time) / speedRamp, 0, 1));
      if (!steady) {
        bank = Math.min(.080, path.curvature * 2.9) * pace;
        tilt = .020 * pace;
      }
      speed = highSpeed;
    } else if (state === 'landing') {
      y = cruiseAltitude * (1 - smooth(ratio));
      heading = tangentAtPad + angleDelta(tangentAtPad, parkedHeading) * smooth(ratio);
      speed = highSpeed;
    } else if (state === 'landed') speed = highSpeed * (1 - smooth(ratio));
    else if (state === 'disembarking') {
      speed = idleSpeed * smooth(ratio);
      door = 1.32 * smooth(clamp(ratio / .23, 0, 1)) * smooth(clamp((1 - ratio) / .24, 0, 1));
    }
    if (!steady && (state === 'startup' || state === 'takeoff' || state === 'landing')) {
      const fade = Math.sin(Math.PI * ratio) ** 2;
      tilt += Math.sin(flightTime * 22) * .0022 * fade;
    }
    if (steady && (state === 'idle' || state === 'complete')) rotorSpeed = 0;
    mainRotor += (rotorSpeed + speed) * .5 * dt;
    rotorSpeed = speed;
    model.pose(x, y, z, heading, bank, tilt, mainRotor, door);
    if (release) poseCamera(dt, ratio, steady);
  }

  const board = {
    x: standing.x, z: standing.z, anchorY: 1.58, radius: 1.48, label: 'Board Helicopter',
    get active() { return state === 'idle' || state === 'complete'; },
    reachable(eye) {
      aircraft.worldToLocal(local.copy(eye));
      return local.x < -1.77 && local.z > .08 && local.z < 2.68 && eye.y < 2.12;
    },
    act({ guideCamera }) {
      if (!board.active || !camera || !guideCamera) return;
      startPosition.copy(camera.position);
      startRotation.copy(camera.quaternion);
      const steady = reducedMotion();
      yaw = wantedYaw = steady ? 1.24 : -1.09;
      pitch = wantedPitch = steady ? -.47 : -.13;
      manualLook = false;
      phaseTime = flightTime = 0;
      state = 'boarding';
      release = guideCamera(look);
      pose(0);
    },
  };

  function update(dt) {
    while (dt > 1e-8 && release) {
      const step = Math.min(dt, flightDurations[state] - phaseTime);
      phaseTime += step;
      flightTime += step;
      dt -= step;
      pose(step);
      if (phaseTime < flightDurations[state] - 1e-8) break;
      const previous = state;
      state = phases[phases.indexOf(state) + 1] ?? 'complete';
      phaseTime = 0;
      if (state === 'startup') playCue(startupCue);
      if (state === 'landed') playCue(touchdownCue);
      if (previous === 'landed') onLanding();
      if (state === 'complete') {
        release(standing);
        release = null;
      }
    }
    if (!release) pose(dt);
  }

  function cancel() {
    release?.(standing);
    release = null;
  }

  return {
    board, update, cancel,
    reset() {
      cancel();
      state = 'idle';
      phaseTime = flightTime = 0;
      mainRotor = .16;
      rotorSpeed = reducedMotion() ? 0 : .63;
      pose(0);
    },
  };
}
