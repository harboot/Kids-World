import { EYE_HEIGHT } from '../../core/player.js';
import { CLIFF_Z, LAKE_LEVEL, clamp, faces, lakeDistance } from './landform.js';
import { approach, createRide, hitsBody, localPoint, safeStand } from './ride.js';
import { createTimberKit } from './structures.js';

const berth = { x: -17.75, z: 15, yaw: 2.8 };
const hullWidth = 1.69;
const hullLength = 3.78;
const hullSections = [
  [-1.66, 0.63, 0.30, -0.14], [-0.98, 0.81, 0.34, -0.22], [0.24, 0.845, 0.35, -0.23],
  [1.08, 0.68, 0.41, -0.14], [1.68, 0.31, 0.53, 0.04], [1.91, 0.048, 0.62, 0.26],
];

function buildBoat(THREE, scene) {
  const ground = new THREE.Group();
  const boat = new THREE.Group();
  ground.name = 'Waterfall lake motorboat';
  ground.add(boat);
  scene.add(ground);
  const wood = new THREE.MeshLambertMaterial({ name: 'Boat trim', color: 0xb17740, flatShading: true });
  const dark = new THREE.MeshLambertMaterial({ name: 'Motor and steering', color: 0x354448, flatShading: true });
  const metal = new THREE.MeshLambertMaterial({ name: 'Boat fastenings', color: 0x718685, flatShading: true });
  const seat = new THREE.MeshLambertMaterial({ name: 'Boat seat', color: 0x3a786e, flatShading: true });
  const shell = faces(THREE, boat, 'Cedar hull with open interior',
    new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  const cedar = new THREE.Color(0x875132), red = new THREE.Color(0xa3623b);
  const inside = new THREE.Color(0xb48450), bottom = new THREE.Color(0x684330);
  const kit = createTimberKit(THREE, boat);

  const rim = (s, side) => [side * s[1], s[2], s[0]];
  const outer = (s, side) => [side * s[1] * 0.63, s[3], s[0]];
  const inner = (s, side) => [side * s[1] * 0.60, Math.max(0.08, s[3] + 0.14), s[0]];
  for (let i = 1; i < hullSections.length; i++) {
    const a = hullSections[i - 1], b = hullSections[i];
    shell.quad(outer(a, 1), outer(b, 1), outer(b, -1), outer(a, -1), bottom);
    shell.quad(inner(a, -1), inner(b, -1), inner(b, 1), inner(a, 1), inside);
    for (const side of [-1, 1]) {
      const oa = outer(a, side), ob = outer(b, side), ra = rim(a, side), rb = rim(b, side);
      const ia = inner(a, side), ib = inner(b, side);
      if (side > 0) {
        shell.quad(oa, ra, rb, ob, i % 2 ? cedar : red);
        shell.quad(ia, ib, rb, ra, inside);
      } else {
        shell.quad(ob, rb, ra, oa, i % 2 ? cedar : red);
        shell.quad(ib, ia, ra, rb, inside);
      }
      kit.beam(wood, ra, rb, 0.078, 0.065);
    }
  }
  const stern = hullSections[0], bow = hullSections.at(-1);
  shell.quad(outer(stern, 1), outer(stern, -1), rim(stern, -1), rim(stern, 1), cedar);
  shell.quad(inner(stern, -1), inner(stern, 1), rim(stern, 1), rim(stern, -1), inside);
  shell.quad(outer(bow, -1), outer(bow, 1), rim(bow, 1), rim(bow, -1), red);
  shell.quad(inner(bow, 1), inner(bow, -1), rim(bow, -1), rim(bow, 1), inside);
  shell.finish();
  kit.box(wood, 0, 0.20, 0.23, 1.02, 0.13, 2.34);
  kit.box(wood, 0, 0.365, 0.85, 1.33, 0.12, 0.29);
  kit.box(wood, 0, 0.30, -0.62, 1.29, 0.16, 0.41);
  kit.box(seat, 0, 0.44, -0.62, 0.61, 0.13, 0.42);
  kit.box(seat, 0, 0.57, -0.82, 0.61, 0.24, 0.085);
  kit.box(wood, 0.37, 0.42, 0.12, 0.39, 0.40, 0.36);
  kit.beam(metal, [0.37, 0.52, 0.01], [0.37, 0.72, -0.13], 0.059);
  kit.box(dark, 0, 0.54, -1.65, 0.36, 0.38, 0.35);
  kit.box(metal, 0, 0.77, -1.69, 0.34, 0.07, 0.32);
  kit.box(dark, 0, 0.12, -1.76, 0.16, 0.52, 0.18);
  kit.box(metal, 0, -0.19, -1.85, 0.28, 0.075, 0.27);
  kit.finish();
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.024, 5, 12), dark);
  wheel.position.set(0.37, 0.72, -0.17);
  wheel.rotation.x = 0.4;
  boat.add(wheel);

  const wake = new THREE.Group();
  wake.name = 'Motorboat surface wake';
  scene.add(wake);
  const foam = new THREE.MeshBasicMaterial({ color: 0xd0f7f5, transparent: true, opacity: 0,
    depthWrite: false, toneMapped: false });
  const foamPositions = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const reach = 0.7 + i * 0.52, x = side * (0.3 + i * 0.19);
      foamPositions.push(x - 0.08, 0, -reach, x + 0.13, 0, -reach - 0.14, x, 0, -reach - 0.57);
    }
  }
  const wakeGeometry = new THREE.BufferGeometry();
  wakeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(foamPositions, 3));
  const pattern = new THREE.Mesh(wakeGeometry, foam);
  wake.add(pattern);
  return { ground, boat, wake, pattern, foam, wheel };
}

export function addBoat({ THREE, scene, camera, world, terrain, waterObstacles, bridges, reducedMotion, notify }) {
  const { ground, boat, wake, pattern, foam, wheel } = buildBoat(THREE, scene);
  const hull = { ...berth, width: hullWidth, length: hullLength };
  const samples = hullSections.flatMap(([z, w]) => [[-w, z], [0, z], [w, z]]);
  const clearPoses = [];
  let speed, time, turn, distanceTravelled;

  function rememberPose() {
    const last = clearPoses.at(-1);
    if (last && Math.hypot(hull.x - last.x, hull.z - last.z) < 0.12) return;
    clearPoses.push({ x: hull.x, z: hull.z, yaw: hull.yaw });
    if (clearPoses.length > 14) clearPoses.shift();
  }

  function retreat(step) {
    const last = clearPoses.at(-1);
    if (!last || step <= 0) return;
    const distance = Math.hypot(hull.x - last.x, hull.z - last.z);
    const progress = distance > 0 ? Math.min(1, step * 2.5 / distance) : 1;
    const x = hull.x + (last.x - hull.x) * progress;
    const z = hull.z + (last.z - hull.z) * progress;
    const angle = last.yaw - hull.yaw;
    const yaw = hull.yaw + Math.atan2(Math.sin(angle), Math.cos(angle)) * progress;
    if (!fits(x, z, yaw)) return;
    Object.assign(hull, { x, z, yaw });
    if (progress === 1) clearPoses.pop();
  }

  function fits(x, z, yaw) {
    for (const [side, forward] of samples) {
      const p = localPoint(x, z, yaw, side, forward);
      if (p.z < CLIFF_Z + 1.48 || p.z > 25.5 || lakeDistance(p.x, p.z) > 1.08 ||
          terrain.sample(p.x, p.z) > LAKE_LEVEL - 0.23 ||
          waterObstacles(p.x, p.z, 0.2) ||
          bridges.some(bridge => bridge.surface(p.x, p.z, -0.15) !== undefined)) return false;
    }
    return true;
  }

  function advance(dt, throttle, steering, pace, stopping) {
    const target = throttle * pace * (throttle >= 0 ? 6.1 : 2.5);
    const braking = stopping || Math.abs(target) < Math.abs(speed) || speed * target < 0;
    speed = approach(speed, target, (stopping ? 4.5 : braking ? 2.75 : 1.85) * dt);
    turn = approach(turn, clamp(-steering, -1, 1), 6 * dt);
    const steps = Math.max(1, Math.ceil(Math.abs(speed) * dt / 0.17));
    for (let i = 0; i < steps; i++) {
      const step = dt / steps;
      const yaw = hull.yaw + turn * step * (0.59 + Math.min(0.68, Math.abs(speed) * 0.17));
      const blockedTurn = yaw !== hull.yaw && !fits(hull.x, hull.z, yaw);
      if (!blockedTurn) hull.yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
      if (!speed) {
        if (!stopping && blockedTurn && steering) retreat(step);
        continue;
      }
      const next = localPoint(hull.x, hull.z, hull.yaw, 0, speed * step);
      if (fits(next.x, next.z, hull.yaw)) {
        distanceTravelled += Math.abs(speed * step);
        hull.x = next.x;
        hull.z = next.z;
        rememberPose();
      } else {
        speed = 0;
        if (!stopping && (throttle < 0 || (blockedTurn && steering))) retreat(step);
        break;
      }
    }
    pose();
    return speed === 0;
  }

  function pose() {
    ground.position.set(hull.x, LAKE_LEVEL, hull.z);
    ground.rotation.y = hull.yaw;
    boat.position.y = reducedMotion() ? 0 : Math.sin(time * 2.2) * 0.035;
    boat.rotation.x = reducedMotion() ? 0 : Math.sin(time * 1.6) * 0.024;
    boat.rotation.z = reducedMotion() ? 0 : Math.cos(time * 1.86) * 0.036 + turn * speed * 0.012;
    wheel.rotation.z = -turn * 0.64;
    wake.visible = Math.abs(speed) > 0.36;
    if (!wake.visible) return;
    const reverse = speed < 0;
    const origin = localPoint(hull.x, hull.z, hull.yaw, 0, reverse ? 1.74 : -1.48);
    wake.position.set(origin.x, LAKE_LEVEL + 0.033, origin.z);
    wake.rotation.y = hull.yaw + (reverse ? Math.PI : 0);
    const strength = clamp(Math.abs(speed) / 5);
    pattern.scale.set(0.59 + strength * 0.44, 1, 0.28 + strength * 0.75);
    foam.opacity = strength * (reducedMotion() ? 0.38 : 0.40 + 0.05 * Math.sin(time * 9));
  }

  function blocks(x, z, radius, feet) {
    return feet < LAKE_LEVEL + 0.53 && hitsBody(x, z, radius, hull);
  }

  function findExit() {
    for (const distance of [1.32, 1.62, 1.98, 2.34, 2.68, 3.05, 3.42]) {
      for (const [side, forward] of [[-distance, -0.2], [distance, -0.2], [-distance, 0.9], [distance, 0.9],
        [-distance, -1.18], [distance, -1.18], [0, distance + 0.54], [0, -distance - 0.55]]) {
        const p = localPoint(hull.x, hull.z, hull.yaw, side, forward);
        if (terrain.sample(p.x, p.z) < LAKE_LEVEL - 0.27) continue;
        const spot = safeStand(world, p.x, p.z, LAKE_LEVEL, 0.9);
        if (!spot || blocks(p.x, p.z, 0.45, spot.elevation)) continue;
        let clear = true;
        for (const t of [0.52, 0.76]) {
          if (waterObstacles(hull.x + (p.x - hull.x) * t, hull.z + (p.z - hull.z) * t, 0.18)) clear = false;
        }
        if (clear) return { ...spot, yaw: hull.yaw + Math.PI };
      }
    }
    return null;
  }

  const ride = createRide({ THREE, camera, label: 'Boat', reducedMotion, notify, advance, findExit,
    driverPose() {
      const p = localPoint(hull.x, hull.z, hull.yaw, 0, -0.59);
      return { ...p, y: LAKE_LEVEL + boat.position.y + 1.44, yaw: hull.yaw };
    },
  });
  const interactions = [[-1.37, -0.26], [1.37, -0.26], [0, 1.7], [0, -1.6]].map(([side, forward]) => {
    const point = () => localPoint(hull.x, hull.z, hull.yaw, side, forward);
    return {
      label: 'Drive Boat', radius: 2.45, silent: true, anchorY: LAKE_LEVEL + 0.59,
      get x() { return point().x; },
      get z() { return point().z; },
      get active() { return !ride.active; },
      reachable(p) {
        return p.z > CLIFF_Z && Math.abs(p.y - EYE_HEIGHT - LAKE_LEVEL) < 0.92 &&
          hitsBody(p.x, p.z, 2.65, hull) && [0.47, 0.71].every(t =>
            !waterObstacles(hull.x + (p.x - hull.x) * t, hull.z + (p.z - hull.z) * t, 0.18));
      },
      act: ride.board,
    };
  });

  function reset() {
    ride.cancel();
    Object.assign(hull, berth);
    speed = turn = time = distanceTravelled = 0;
    clearPoses.length = 0;
    rememberPose();
    pose();
  }
  reset();
  return {
    interactions, blocks, reset, cancel: ride.cancel,
    get driving() { return ride.active; },
    get distanceTravelled() { return distanceTravelled; },
    position: ground.position,
    update(elapsed) {
      time = (time + elapsed) % 1200;
      pose();
    },
  };
}
