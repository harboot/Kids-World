import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { nearestInteraction } from '../core/interactions.js';
import { PLAYER_RADIUS, walkElevation } from '../core/movement.js';
import { createPlayer, EYE_HEIGHT } from '../core/player.js';
import { addBoat } from '../areas/waterfall-valley/boat.js';
import valley from '../areas/waterfall-valley/index.js';
import { LAKE_LEVEL, nearest } from '../areas/waterfall-valley/landform.js';
import { shaft } from '../areas/waterfall-valley/lift-layout.js';
import { createMineLayout, mineLake } from '../areas/waterfall-valley/mine-layout.js';
import { CAR_SPACING, createRailRoute, WHEELBASE } from '../areas/waterfall-valley/rail-route.js';
import { safeStand } from '../areas/waterfall-valley/ride.js';

const mine = createMineLayout(THREE);

function build() {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const player = createPlayer(THREE, camera);
  const notices = [];
  const area = valley.load({ THREE, scene, camera, reducedMotion: () => true,
    notify: text => notices.push(text), carryPlayer: player.carryVertically });
  const locomotive = scene.getObjectByName('Mining locomotive');
  const boat = scene.getObjectByName('Waterfall lake motorboat');
  const lift = scene.getObjectByName('Mine lift moving platform');
  let controls, savedExit;
  const interaction = label => area.interactions.find(item => item.label === label && item.active !== false);

  function board(label, verifyReach = true) {
    assert.equal(controls, undefined);
    const boarding = interaction(label);
    assert.ok(boarding, label);
    if (verifyReach) assert.equal(nearestInteraction(area.interactions, camera.position)?.label, label);
    savedExit = undefined;
    boarding.act({ guideCamera(look, options) {
      controls = { look, ...options };
      return spot => {
        savedExit = spot;
        controls = undefined;
        player.reset(spot, area);
      };
    } });
    assert.ok(controls, 'core driving callback registered');
  }

  function drive(throttle, frames, steer = 0) {
    for (let i = 0; i < frames && controls; i++) controls.drive(0.05, { x: steer, y: -throttle }, 1);
  }

  function exit() {
    assert.ok(controls);
    controls.prompt.act();
  }

  function walk(points, elevation) {
    let [x, z] = points[0];
    let feet = area.getGroundHeight(x, z, elevation);
    for (const [px, pz] of points.slice(1)) {
      const steps = Math.ceil(Math.hypot(px - x, pz - z) / 0.08);
      const dx = (px - x) / steps, dz = (pz - z) / steps;
      for (let i = 0; i < steps; i++) {
        const next = walkElevation(area, { x, z }, x + dx, z + dz, feet, true);
        assert.notEqual(next, null, `blocked at ${x}, ${z}, ${feet} toward ${px}, ${pz}`);
        x += dx;
        z += dz;
        feet = next;
        assert.ok(feet + 1.82 <= area.getCeilingHeight(x, z, feet));
      }
    }
    player.reset({ x, z, elevation: feet }, area);
    return feet;
  }

  return {
    area, boat, camera, locomotive, lift, notices, player, scene, interaction, board, drive, exit, walk,
    get controls() { return controls; },
    get savedExit() { return savedExit; },
  };
}

test('all three cars follow independent axles through curves on the rising trestle', () => {
  const f = build();
  f.walk([[-14,-23],[-17,-31]], 1.4);
  f.board('Drive Train');
  assert.equal(f.controls.prompt.label, 'Exit Train');
  const initial = f.locomotive.position.clone();
  f.drive(1, 150);
  assert.ok(f.locomotive.position.y > initial.y + 3);
  const wagons = ['Open cargo wagon 1', 'Open cargo wagon 2'].map(name => f.scene.getObjectByName(name));
  for (const car of [f.locomotive, ...wagons]) {
    for (const distance of [-WHEELBASE / 2, WHEELBASE / 2]) {
      const axle = new THREE.Vector3(0, 0, distance).applyQuaternion(car.quaternion).add(car.position);
      const track = nearest(mine.main, axle.x, axle.z);
      assert.ok(track.offset < 0.05);
      assert.ok(Math.abs(axle.y - track.y - 0.193) < 0.007);
    }
  }
  assert.ok(wagons[1].position.distanceTo(wagons[0].position) < CAR_SPACING + 0.03);
  assert.ok(wagons[1].quaternion.angleTo(f.locomotive.quaternion) > 0.05);
  const orientation = f.camera.quaternion.clone();
  f.controls.look(0.7, -0.1);
  f.drive(0, 1);
  assert.ok(orientation.angleTo(f.camera.quaternion) > 0.3);
  const beforeBrake = f.locomotive.position.clone();
  f.exit();
  assert.ok(f.controls, 'a moving train brakes before releasing the rider');
  f.drive(0, 100);
  assert.equal(f.controls, undefined);
  assert.ok(f.locomotive.position.distanceTo(beforeBrake) > 0.05);
  const { x, z, elevation } = f.savedExit;
  assert.ok(elevation > mineLake.y && Math.hypot(x - f.locomotive.position.x, z - f.locomotive.position.z) < 2.9);
  assert.ok(safeStand(f.area, x, z, elevation));
  const parked = f.locomotive.position.clone();
  f.area.update(0.05, f.camera.position);
  assert.ok(parked.equals(f.locomotive.position));
  f.board('Drive Train');
  f.drive(1, 1150);
  const upper = f.locomotive.position.clone();
  assert.ok(upper.y > 21 && upper.z < -23);
  f.drive(1, 90);
  assert.ok(upper.equals(f.locomotive.position));
  f.drive(-1, 1950);
  const lower = f.locomotive.position.clone();
  assert.ok(lower.y < 2 && lower.distanceTo(initial) < 1.35);
  f.drive(-1, 80);
  assert.ok(lower.equals(f.locomotive.position));
});

test('intermediate stops on the main line and both spurs offer nearby walkable exits', () => {
  const f = build();
  for (const selected of [null, 'Crystal Hall', 'Shaft Hall']) {
    f.area.reset();
    if (selected) f.interaction('Switch to ' + selected).act();
    let stopped = 0;
    let last = f.locomotive.position.clone();
    for (let i = 0; i < 480 && stopped < 2; i++) {
      f.board('Drive Train', false);
      f.drive(1, 14);
      f.exit();
      f.drive(0, 35);
      assert.equal(f.controls, undefined, `could not exit beside train at ${f.locomotive.position.toArray()}`);
      assert.ok(Math.hypot(f.savedExit.x - f.locomotive.position.x, f.savedExit.z - f.locomotive.position.z) < 3.3);
      stopped = f.locomotive.position.distanceTo(last) < 0.005 ? stopped + 1 : 0;
      last.copy(f.locomotive.position);
    }
    assert.equal(stopped, 2, 'reached endpoint');
    if (selected === 'Crystal Hall') assert.ok(last.y < 5 && last.z < -60);
    if (selected === 'Shaft Hall') assert.ok(last.x > 33 && last.z > -60 && last.y > 15);
  }
});

test('a turnout stays locked under a wagon, preserves the route in reverse, and can be changed after clearing', () => {
  const rail = createRailRoute(mine);
  const point = rail.junctionDistance(0);
  assert.equal(rail.toggle(0), true);
  rail.move(point - rail.head + CAR_SPACING * 2 + 0.25);
  assert.equal(rail.occupied(0), true);
  assert.equal(rail.toggle(0), false);
  rail.move(100);
  const p = rail.positionAt(rail.head);
  assert.ok(nearest(mine.branches[0], p.x, p.z).offset < 0.05);
  rail.move(point - rail.head - 3.1);
  assert.equal(rail.occupied(0), false);
  assert.equal(rail.toggle(0), true);
  rail.move(1000);
  assert.ok(rail.positionAt(rail.head).y > 20.9);

  const f = build();
  f.board('Drive Train', false);
  f.drive(1, 29);
  f.drive(0.18, 1, 1);
  assert.ok(f.notices.includes('Switch set to Crystal Hall.'));
  f.drive(1, 650);
  assert.ok(f.locomotive.position.x > -12 && f.locomotive.position.y < 5);
  f.drive(-1, 800);
  assert.ok(f.locomotive.position.y < 2);
});

test('the boat steers, brakes for exits, respects shore and waterfall bounds, and keeps its berth', () => {
  const f = build();
  const berth = f.boat.position.clone();
  f.walk([[-21,39],[-20,18.5],[-20.25,14.75]]);
  f.board('Drive Boat');
  assert.equal(f.controls.prompt.label, 'Exit Boat');
  f.drive(1, 125);
  assert.ok(f.boat.position.distanceTo(berth) > 14);
  f.exit();
  f.drive(0, 100);
  assert.ok(f.controls, 'deep water is not an exit');
  assert.match(f.notices.at(-1), /shallow shore/);
  f.drive(-1, 400);
  assert.ok(f.boat.position.distanceTo(berth) < 1.1);
  f.exit();
  f.drive(0, 70);
  assert.equal(f.controls, undefined);
  const parked = f.boat.position.clone();
  assert.ok(safeStand(f.area, f.savedExit.x, f.savedExit.z, LAKE_LEVEL, 0.92));
  f.area.update(0.05, f.camera.position);
  assert.ok(f.boat.position.equals(parked));
  f.board('Drive Boat');
  f.drive(1, 90);
  const heading = f.boat.rotation.y;
  f.drive(0.65, 18, -1);
  assert.ok(Math.abs(f.boat.rotation.y - heading) > 0.3);
  f.drive(1, 420);
  const edge = f.boat.position.clone();
  assert.ok(edge.z > -21 && edge.z < 25);
  f.drive(1, 60);
  assert.ok(edge.equals(f.boat.position), 'held throttle cannot drive through the boundary');
  assert.equal(edge.y, LAKE_LEVEL);
});

test('a rock inside the boat clearance stops the hull sweep before impact', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  let rockPresent = true, controls;
  const boat = addBoat({ THREE, scene, camera, world: {}, terrain: { sample: () => -2 },
    waterObstacles: (x, z, radius) => rockPresent && Math.hypot(x + 15.93, z - 9.9) < 1.15 + radius,
    bridges: [], reducedMotion: () => true, notify() {} });
  boat.interactions[0].act({ guideCamera(look, options) { controls = options; return () => {}; } });
  const hull = scene.getObjectByName('Waterfall lake motorboat');
  for (let i = 0; i < 120; i++) controls.drive(0.05, { x: 0, y: -1 }, 1);
  assert.ok(hull.position.z > 12 && hull.position.z < 15);
  const stopped = hull.position.clone();
  for (let i = 0; i < 30; i++) controls.drive(0.05, { x: 0, y: -1 }, 1);
  assert.ok(hull.position.equals(stopped));
  rockPresent = false;
  for (let i = 0; i < 110; i++) controls.drive(0.05, { x: 0, y: -1 }, 1);
  assert.ok(hull.position.z < 9);
});

test('the two lift landings and access tunnel support local walking and safe calls from either level', () => {
  const f = build();
  const lowerAccess = [[-14,-23],[-12.5,-26.5],[-11,-33.25],[-6.75,-33.25],
    [-0.75,-34.5],[16.75,-45.75],[27.25,-56]];
  assert.equal(f.walk(lowerAccess, 1.4), shaft.lower);
  assert.equal(nearestInteraction(f.area.interactions, f.camera.position)?.label, 'Go Up');
  assert.equal(f.area.blocksGround(shaft.x, shaft.z, PLAYER_RADIUS, shaft.upper), true);
  const goUp = f.interaction('Go Up');
  goUp.act();
  assert.equal(goUp.active, false);
  assert.equal(f.area.interactions.filter(i => i.label === 'Call Lift' && i.active).length, 0);
  const before = f.camera.position.clone();
  for (let i = 0; i < 145; i++) {
    f.player.move(0.05, { x: i > 24 && i < 33 ? 0.38 : 0, y: 0 }, { area: f.area, definition: valley });
    f.area.update(0.05, f.camera.position);
    if (i === 58) {
      assert.ok(f.lift.position.y > shaft.lower + 3 && f.lift.position.y < shaft.upper);
      assert.equal(f.area.blocksGround(shaft.x + shaft.half, shaft.z, PLAYER_RADIUS,
        f.lift.position.y, { x: shaft.x, z: shaft.z }), true);
    }
  }
  assert.equal(f.lift.position.y, shaft.upper);
  assert.ok(f.camera.position.x > before.x + 0.4);
  assert.ok(Math.abs(f.camera.position.y - shaft.upper - EYE_HEIGHT) < 1e-8);
  f.walk([[f.camera.position.x,-56],[31,-56],[38,-45.75],[37.25,-45.5],
    [29,-26.5],[21.25,-24.25],[17.5,-21.75],[17,-21.75]], shaft.upper);
  assert.equal(f.area.blocksGround(shaft.x, shaft.z, PLAYER_RADIUS, shaft.lower), true);
  const lowerCall = f.interaction('Call Lift');
  assert.equal(lowerCall.reachable({ x: lowerCall.x, z: lowerCall.z, y: shaft.lower + EYE_HEIGHT }), true);
  lowerCall.act();
  for (let i = 0; i < 140; i++) f.area.update(0.05, f.camera.position);
  assert.equal(f.lift.position.y, shaft.lower);
  assert.ok(Math.abs(f.camera.position.y - 21 - EYE_HEIGHT) < 0.09);
  const upperCall = f.interaction('Call Lift');
  assert.equal(upperCall.reachable({ x: upperCall.x, z: upperCall.z, y: shaft.upper + EYE_HEIGHT }), true);
  upperCall.act();
  for (let i = 0; i < 140; i++) f.area.update(0.05, f.camera.position);
  assert.equal(f.lift.position.y, shaft.upper);
  f.walk([[31,-56],[28.4,-56]], shaft.upper);
  assert.equal(nearestInteraction(f.area.interactions, f.camera.position)?.label, 'Go Down');
  f.interaction('Go Down').act();
  for (let i = 0; i < 140; i++) f.area.update(0.05, f.camera.position);
  assert.ok(Math.abs(f.camera.position.y - shaft.lower - EYE_HEIGHT) < 1e-8);
  f.walk([[28.4,-56],[25.5,-56]], shaft.lower);
});
