import { EYE_HEIGHT } from '../../core/player.js';
import { CAR_SPACING, WHEELBASE, createRailRoute } from './rail-route.js';
import { approach, createRide, hitsBody, localPoint, safeStand } from './ride.js';
import { createTimberKit } from './structures.js';

const carWidth = 1.56;
const carLengths = [2.46, 2.21, 2.21];
const wheelRadius = 0.29;
const railTop = 0.193;

function buildTrain(THREE, scene) {
  const material = (color, name) => new THREE.MeshBasicMaterial({ color, name, toneMapped: false });
  const iron = material(0x364550, 'Mine train iron'), edge = material(0x566772, 'Mine train fittings');
  const dark = material(0x252b2c, 'Mine train chassis'), brass = material(0xcf9654, 'Mine train brass');
  const paint = material(0xb76832, 'Locomotive orange'), wood = material(0x805a3f, 'Cargo wagon wood');
  const headlight = material(0xffdf9a, 'Mine train headlamps'), marker = material(0xe17853, 'Wagon marker lamps');
  const wheel = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.115, 12).rotateZ(Math.PI / 2);
  const hub = new THREE.CylinderGeometry(0.13, 0.13, 0.031, 8).rotateZ(Math.PI / 2);
  const cars = carLengths.map((length, index) => {
    const ground = new THREE.Group();
    ground.name = index ? 'Open cargo wagon ' + index : 'Mining locomotive';
    scene.add(ground);
    const kit = createTimberKit(THREE, ground);
    const box = (...args) => kit.box(...args);
    box(dark, 0, 0.56, 0, 1.39, 0.19, length);
    box(iron, 0, 0.69, 0, carWidth, 0.075, length - 0.03);
    for (const sign of [-1, 1]) {
      box(edge, 0, 0.45, sign * (length / 2 - 0.06), 1.25, 0.12, 0.13);
      box(dark, sign * 0.5, 0.39, 0, 0.12, 0.22, length - 0.42);
    }
    if (index === 0) {
      box(paint, 0, 0.96, 0.61, 1.27, 0.48, 1.05);
      box(iron, 0, 1.23, 0.59, 1.21, 0.075, 1.0);
      box(iron, 0, 0.86, -0.3, 0.96, 0.25, 0.24);
      box(wood, 0, 1.03, -0.56, 0.53, 0.18, 0.42);
      box(dark, 0, 1.24, -0.78, 0.55, 0.38, 0.1);
      box(paint, 0, 2.03, -0.45, 1.56, 0.13, 1.42);
      box(edge, 0, 2.13, -0.45, 1.43, 0.08, 1.29);
      for (const sign of [-1, 1]) {
        box(iron, sign * 0.68, 1.37, -1.06, 0.09, 1.34, 0.10);
        box(iron, sign * 0.68, 1.48, 0.16, 0.09, 1.12, 0.1);
        box(iron, sign * 0.68, 0.97, -0.67, 0.09, 0.075, 0.72);
        box(brass, sign * 0.32, 0.91, 1.19, 0.22, 0.25, 0.12);
        box(headlight, sign * 0.32, 0.91, 1.26, 0.15, 0.18, 0.028);
        box(brass, sign * 0.53, 1.28, -1.13, 0.16, 0.21, 0.11);
        box(headlight, sign * 0.53, 1.28, -1.193, 0.103, 0.133, 0.022);
      }
      for (let i = 0; i < 5; i++) box(edge, -0.38 + i * 0.19, 1.068, 1.147, 0.08, 0.11, 0.024);
      kit.beam(brass, [0.36, 0.91, -0.12], [0.39, 1.31, -0.29], 0.057);
      kit.beam(edge, [-0.36, 0.91, -0.10], [-0.37, 1.20, -0.24], 0.047);
      box(dark, 0.39, 1.32, -0.29, 0.15, 0.08, 0.085);
    } else {
      for (const side of [-1, 1]) {
        box(wood, side * 0.728, 0.99, 0, 0.105, 0.55, length - 0.19);
        box(iron, side * 0.728, 1.28, 0, 0.12, 0.065, length);
        box(wood, 0, 0.99, side * (length / 2 - 0.06), 1.36, 0.55, 0.105);
        box(edge, 0, 1.28, side * (length / 2 - 0.06), 1.37, 0.065, 0.11);
        for (const z of [-0.81, 0, 0.81]) box(iron, side * 0.792, 0.985, z, 0.048, 0.56, 0.083);
        if (index === 2) box(marker, side * 0.52, 0.98, -length / 2 - 0.023, 0.15, 0.125, 0.046);
      }
    }
    kit.finish();

    const wheels = [];
    for (const z of [-WHEELBASE / 2, WHEELBASE / 2]) {
      for (const side of [-1, 1]) {
        const axle = new THREE.Group();
        axle.position.set(side * 0.62, wheelRadius, z);
        const rim = new THREE.Mesh(wheel, dark);
        const cap = new THREE.Mesh(hub, edge);
        cap.position.x = side * 0.062;
        axle.add(rim, cap);
        ground.add(axle);
        wheels.push(axle);
      }
    }
    return { ground, wheels, x: 0, z: 0, y: 0, yaw: 0, width: carWidth, length };
  });
  const link = new THREE.BoxGeometry(0.155, 1, 0.16);
  const couplers = [0, 1].map(() => {
    const mesh = new THREE.Mesh(link, brass);
    mesh.name = 'Articulated wagon coupling';
    scene.add(mesh);
    return mesh;
  });
  return { cars, couplers };
}

export function addTrain({ THREE, scene, camera, mine, world, reducedMotion, notify }) {
  const track = createRailRoute(mine);
  const { cars, couplers } = buildTrain(THREE, scene);
  const front = {}, back = {};
  const target = new THREE.Vector3(), linkA = new THREE.Vector3(), linkB = new THREE.Vector3();
  const direction = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const switchNames = ['Crystal Hall', 'Shaft Hall'];
  const locomotive = cars[0];
  let speed = 0, steerHeld = false;

  function pose(distance = 0) {
    for (const [i, car] of cars.entries()) {
      const center = track.head - i * CAR_SPACING;
      track.positionAt(center + WHEELBASE / 2, front);
      track.positionAt(center - WHEELBASE / 2, back);
      car.x = (front.x + back.x) / 2;
      car.y = (front.y + back.y) / 2 + railTop;
      car.z = (front.z + back.z) / 2;
      car.yaw = Math.atan2(front.x - back.x, front.z - back.z);
      car.ground.position.set(car.x, car.y, car.z);
      target.set(front.x, front.y + railTop, front.z);
      car.ground.lookAt(target);
      for (const wheel of car.wheels) wheel.rotation.x = (wheel.rotation.x + distance / wheelRadius) % (Math.PI * 2);
    }
    for (const [i, link] of couplers.entries()) {
      const first = cars[i], second = cars[i + 1];
      linkA.set(0, 0.47, -first.length / 2).applyQuaternion(first.ground.quaternion).add(first.ground.position);
      linkB.set(0, 0.47, second.length / 2).applyQuaternion(second.ground.quaternion).add(second.ground.position);
      direction.subVectors(linkB, linkA);
      link.position.copy(linkA).lerp(linkB, 0.5);
      link.scale.y = direction.length() + 0.04;
      link.quaternion.setFromUnitVectors(up, direction.normalize());
    }
  }

  function blocks(x, z, radius, feet) {
    return cars.some((car, index) => feet < car.y + (index === 0 ? 2.17 : 1.31)
      && feet + EYE_HEIGHT + 0.14 > car.y - 0.25 && hitsBody(x, z, radius, car));
  }

  function boardPoint(side) {
    return localPoint(locomotive.x, locomotive.z, locomotive.yaw, side * 1.45, -0.43);
  }

  function findExit() {
    const { x, y, z, yaw } = locomotive;
    for (const [along, outward] of [[0, 1.4], [0, 1.75], [0, 2.15], [0.9, 1.57], [-0.95, 1.57],
      [1.1, 2.13], [-1.16, 2.13], [1.8, 1.65], [-1.8, 1.72], [0, 2.73], [2.5, 1.84]]) {
      for (const side of [-1, 1]) {
        const p = localPoint(x, z, yaw, side * outward, along);
        const spot = safeStand(world, p.x, p.z, y - railTop, 0.75);
        if (!spot || blocks(p.x, p.z, 0.38, spot.elevation)) continue;
        const near = localPoint(x, z, yaw, side * 1.19, along);
        if (outward > 1.75 && world.blocksGround(near.x, near.z, 0.12, spot.elevation, near, true)) continue;
        return { ...spot, yaw: yaw + Math.PI, pitch: 0 };
      }
    }
    return null;
  }

  function toggle(index) {
    if (!track.toggle(index)) {
      notify('The train is still on the switch.');
      return;
    }
    updateSwitch(index);
    notify(track.switches[index].selected ? 'Switch set to ' + switchNames[index] + '.' : 'Switch set to the main line.');
  }

  function advance(dt, throttle, steering, pace, stopping) {
    const pressed = Math.abs(steering) > 0.55;
    if (!stopping && pressed && !steerHeld) {
      const lever = track.switches.find(({ index }) => {
        const gap = track.junctionDistance(index) - track.head;
        return gap > 2.8 && gap < 9.5;
      });
      if (lever) toggle(lever.index);
    }
    steerHeld = pressed;
    const targetSpeed = throttle * pace * (throttle >= 0 ? 6.7 : 4.25);
    const braking = stopping || speed * targetSpeed < 0 || Math.abs(targetSpeed) < Math.abs(speed);
    speed = approach(speed, targetSpeed, (braking ? 4.2 : 2.3) * dt);
    if (speed) {
      const requested = speed * dt;
      const moved = track.move(requested);
      if (Math.abs(moved - requested) > 0.0001) speed = 0;
      if (moved) pose(moved);
    }
    return speed === 0;
  }

  const ride = createRide({ THREE, camera, label: 'Train', reducedMotion, notify, advance, findExit,
    driverPose() {
      const p = localPoint(locomotive.x, locomotive.z, locomotive.yaw, 0, -0.42);
      return { ...p, y: locomotive.y + 1.66, yaw: locomotive.yaw };
    },
  });
  const controls = track.switches.map(({ index, point: [x, z] }) => {
    const branch = track.switches[index].spur.points[1];
    const sign = index === 0 ? -1 : 1;
    const heading = Math.atan2(branch[0] - x, branch[1] - z);
    const p = localPoint(x, z, heading, sign * 2.45, -1.2);
    const panel = new THREE.Group();
    panel.name = switchNames[index] + ' railway switch';
    panel.position.set(p.x, mine.floor.sample(p.x, p.z), p.z);
    panel.rotation.y = heading;
    scene.add(panel);
    const kit = createTimberKit(THREE, panel);
    const metal = new THREE.MeshBasicMaterial({ color: 0x515e61, toneMapped: false });
    const lampA = new THREE.MeshBasicMaterial({ toneMapped: false }), lampB = lampA.clone();
    kit.box(metal, 0, 0.49, 0, 0.14, 0.98, 0.18);
    kit.box(metal, 0, 0.17, 0, 0.47, 0.23, 0.37);
    kit.box(metal, 0, 1.74, 0, 0.49, 0.56, 0.16);
    kit.box(lampA, -0.12, 1.66, -0.093, 0.14, 0.15, 0.03);
    kit.box(lampB, 0.12, 1.66, -0.093, 0.14, 0.15, 0.03);
    for (const [offset, tip, color] of [[-0.12, 0, lampA], [0.12, sign * 0.07, lampB]]) {
      const point = [offset + tip, 1.96, -0.095];
      kit.beam(color, [offset, 1.78, -0.095], point, 0.023);
      kit.beam(color, [point[0] - 0.041, 1.915, -0.095], point, 0.022);
      kit.beam(color, [point[0] + 0.041, 1.915, -0.095], point, 0.022);
    }
    kit.finish();
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.46, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xc99048, toneMapped: false }));
    lever.position.set(0, 0.97, 0);
    panel.add(lever);
    return { p, panel, lampA, lampB, lever };
  });

  function updateSwitch(index) {
    const { lampA, lampB, lever } = controls[index];
    const selected = track.switches[index].selected;
    lampA.color.setHex(selected ? 0x66362a : 0xa5f193);
    lampB.color.setHex(selected ? 0xa5f193 : 0x66362a);
    lever.rotation.z = selected ? -0.7 : 0.7;
    lever.position.x = selected ? 0.13 : -0.13;
  }

  const interactions = [-1, 1].map(side => ({
    label: 'Drive Train', radius: 1.3, silent: true,
    get x() { return boardPoint(side).x; },
    get z() { return boardPoint(side).z; },
    get anchorY() { return locomotive.y + 1.07; },
    get active() { return !ride.active; },
    reachable(p) { return Math.abs(p.y - EYE_HEIGHT - locomotive.y + railTop) < 0.82; },
    act: ride.board,
  }));
  for (const [index, { p, panel }] of controls.entries()) {
    interactions.push({
      ...p, anchorY: panel.position.y + 1.32, radius: 1.55, silent: true,
      get label() { return track.switches[index].selected ? 'Switch to Main Line' : 'Switch to ' + switchNames[index]; },
      reachable(p) { return Math.abs(p.y - EYE_HEIGHT - panel.position.y) < 0.72; },
      act() { toggle(index); },
    });
  }

  function reset() {
    ride.cancel();
    track.reset();
    speed = 0;
    steerHeld = false;
    for (const car of cars) for (const wheel of car.wheels) wheel.rotation.x = 0;
    controls.forEach((_, index) => updateSwitch(index));
    pose();
  }
  reset();
  return { interactions, blocks, reset, cancel: ride.cancel };
}
