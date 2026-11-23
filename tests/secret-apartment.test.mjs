import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { areas } from '../game.js';
import { createApartmentMission, STEP } from '../areas/secret-apartment/missions.js';
import { nearestInteraction } from '../core/interactions.js';
import { createLevelProgress } from '../core/level-progress.js';
import { walkElevation } from '../core/movement.js';
import { createPlayer } from '../core/player.js';
import { areaURL, createWorldManager, isPublicArea, resolveArea } from '../core/world-manager.js';
import { missionHudFixture } from './helpers/mission-hud.mjs';

const ID = 'secret-apartment';

test('the link-only area opens by explicit URL and never enters public progress', async () => {
  const root = new URL('https://example.test/Kids-World/');
  assert.equal(isPublicArea(areas, ID), false);
  assert.equal(resolveArea(root, areas, 'garden', ID), 'garden');
  assert.equal(resolveArea(new URL('?arrive=secret-apartment', root), areas, 'garden'), 'garden');
  assert.equal(resolveArea(new URL('?arrive=secret-apartment', root), areas, 'garden', 'snow'), 'snow');
  const explicit = resolveArea(new URL('?area=secret-apartment&arrive=snow', root), areas, 'garden', 'snow');
  assert.equal(explicit, ID);
  const worlds = createWorldManager(THREE, { areas, camera: new THREE.PerspectiveCamera(), services: {} });
  assert.equal((await worlds.load(explicit)).definition.title, 'Secret Apartment — 17E');
  worlds.unload();
  assert.equal(resolveArea(areaURL(root, ID), areas, 'garden'), ID);
  assert.equal(resolveArea(new URL('?area=snow', root), areas, 'garden', ID), 'snow');

  let saved = JSON.stringify([ID, 'garden@3']);
  const progress = createLevelProgress(areas, () => ({
    getItem: () => saved,
    setItem(key, value) { saved = value; },
  }));
  progress.complete(ID);
  assert.equal(progress.has(ID), false);
  assert.deepEqual(JSON.parse(saved), [ID, 'garden@3']);
  progress.complete('snow');
  assert.deepEqual(JSON.parse(saved), ['garden@3', 'snow@3']);
  assert.equal(progress.has('garden'), true);
});

async function fixture(reducedMotion = false) {
  const camera = new THREE.PerspectiveCamera();
  const player = createPlayer(THREE, camera);
  const cues = [];
  const missionHud = missionHudFixture();
  const elements = new Set();
  function createElement() {
    const el = {
      style: {}, children: [], textContent: '',
      setAttribute() {},
      append(...nodes) { this.children.push(...nodes); },
      remove() { elements.delete(el); },
    };
    elements.add(el);
    return el;
  }
  const hud = { ownerDocument: { createElement }, append(node) { this.overlay = node; } };
  const worlds = createWorldManager(THREE, {
    areas, camera,
    services: { reducedMotion: () => reducedMotion, playCue: cue => cues.push(cue), hud, notify: missionHud.notify },
  });
  const { area, scene, definition, lifetime } = await worlds.load(ID);
  const { position } = camera;
  const arrivals = [];
  const action = {
    relocate(spawn) {
      arrivals.push(spawn);
      player.reset(spawn, area);
    },
  };
  player.reset(definition.spawn, area);

  function move(x, z) {
    const { x: startX, z: startZ } = position;
    const steps = Math.max(1, Math.ceil(Math.hypot(x - startX, z - startZ) / 0.13));
    for (let i = 1; i <= steps; i++) {
      const nextX = startX + (x - startX) * i / steps;
      const nextZ = startZ + (z - startZ) * i / steps;
      assert.equal(walkElevation(area, position, nextX, nextZ, 0, true), 0,
        `walkable on the route to (${x}, ${z}) at (${nextX.toFixed(2)}, ${nextZ.toFixed(2)})`);
      position.set(nextX, 1.68, nextZ);
      worlds.update(.025, position);
    }
  }

  const find = label => area.interactions.find(item => item.label === label);
  const prompt = label => nearestInteraction(area.interactions, position, item => item.label === label);

  function act(label) {
    const item = prompt(label);
    assert.equal(item?.label, label);
    item.act(action);
    return item;
  }

  function update(seconds) {
    for (let i = 0; i < Math.ceil(seconds / 0.05); i++) worlds.update(0.05, position);
  }

  function approachCar() {
    move(-86.35, 6.28);
    move(-81.05, 6.28);
    move(-80.60, 5.37);
  }

  function takeCard() {
    approachCar();
    act('Open Car Door');
    update(0.65);
    move(-80.36, 5.32);
    act('Take Access Card');
  }

  function approachElevator() {
    move(-81.05, 6.28);
    move(-86.35, 6.28);
    move(-86.36, -8.31);
  }

  function enterElevator() {
    approachElevator();
    act('Call elevator');
    update(0.75);
    move(-88, -8.65);
    move(-88, -11.18);
  }

  function collectLighter() {
    move(0, -6.7);
    assert.equal(find('Open terrace doors'), undefined);
    update(.75);
    assert.equal(area.blocksGround(0, -5.35), false);
    move(0, -3.0);
    move(-15.6, -3.0);
    move(-15.6, 16.0);
    move(-15.7, 23.0);
    move(-17.1, 26.7);
    act('Pick Up Lighter');
    move(-15.7, 23.0);
    move(-15.6, 16.0);
    move(-15.6, -3.0);
    move(0, -3.0);
    update(.75);
    move(0, -12);
  }

  function kitchen() {
    takeCard();
    enterElevator();
    act('Go to Floor 8');
    update(2);
    collectLighter();
    act('Go to Floor 17');
    update(2);
    move(88, -7.7);
    move(92.75, -7.05);
    assert.equal(area.blocksGround(92.75, -5.35), true);
    act('Open Unit 17E');
    update(0.60);
    move(92.75, -2.74);
    move(91.34, -1.37);
    assert.equal(area.blocksGround(89.94, 0.08), true, 'the sofa is solid');
    move(91.34, -2.74);
    move(96.25, -2.74);
    move(97.15, -0.62);
  }

  return {
    area, scene, position, definition, player, worlds, lifetime, arrivals, move, act, update,
    find, prompt, cues, hud, elements, action, approachCar, takeCard, approachElevator, enterElevator, collectLighter, kitchen,
    missionHud,
  };
}

function assertProgress(missionStatus, counts, completion) {
  assert.deepEqual(missionStatus.missions.slice(0, 3).map(({ id, current, total, complete }) => [id, current, total, complete]), [
    ['basement', counts[0], 2, completion[0]],
    ['floor8', counts[1], 2, completion[1]],
    ['floor17', counts[2], 5, completion[2]],
  ]);
}

test('mission state enforces order and emits one countdown and one ending', () => {
  const cues = [];
  const notifications = [];
  const mission = createApartmentMission(cue => cues.push(cue), undefined, message => notifications.push(message));
  const { missionStatus } = mission;
  assert.equal(mission.step, STEP.CAR);
  assertProgress(missionStatus, [0, 0, 0], [false, false, false]);
  assert.equal(mission.accessMessage('basement'), '');
  assert.equal(mission.accessMessage('floor17'), 'Access Card Required');
  mission.visit('floor17');
  mission.takeLighter();
  mission.activateControl();
  mission.startCountdown();
  assert.equal(mission.step, STEP.CAR);
  assert.deepEqual(cues, []);

  mission.openCar();
  mission.openCar();
  assertProgress(missionStatus, [1, 0, 0], [false, false, false]);
  mission.takeCard();
  mission.takeCard();
  assert.equal(cues.length, 2);
  assert.equal(mission.accessMessage('floor8'), '');
  assert.equal(mission.accessMessage('floor17'), 'Floor 17 Locked');
  mission.takeLighter();
  assert.equal(mission.step, STEP.FLOOR_8);
  assertProgress(missionStatus, [2, 0, 0], [true, false, false]);
  mission.visit('floor8');
  assertProgress(missionStatus, [2, 1, 0], [true, false, false]);
  mission.takeLighter();
  mission.takeLighter();
  assert.equal(cues.length, 3);
  assert.equal(mission.accessMessage('floor17'), '');
  assertProgress(missionStatus, [2, 2, 0], [true, true, false]);
  mission.visit('floor8');
  mission.visit('floor17');
  mission.openUnit();
  mission.startCountdown();
  assert.equal(mission.step, STEP.CONTROL);
  assertProgress(missionStatus, [2, 2, 2], [true, true, false]);
  mission.activateControl();
  mission.startCountdown();
  mission.update(0.5);
  mission.startCountdown();
  mission.update(0.5);
  const announcements = ['5', mission.announcement];
  for (let second = 0; second < 4; second++) {
    mission.update(1);
    announcements.push(mission.announcement);
  }
  assert.deepEqual(announcements, ['5', '4', '3', '2', '1', 'BOOM!']);
  assert.equal(mission.damaged, true);
  assertProgress(missionStatus, [2, 2, 4], [true, true, false]);
  assert.equal(cues.length, 7);
  mission.update(3);
  mission.startCountdown();
  mission.update(10);
  assert.equal(cues.length, 7);
  assert.equal(mission.cinematic, false);
  assert.equal(mission.step, STEP.COMPLETE);
  assertProgress(missionStatus, [2, 2, 5], [true, true, true]);
  assert.deepEqual(notifications, ['Access card acquired', 'Lighter acquired', 'Unit 17E sequence complete. Return to Floor 8.']);
  assert.match(missionStatus.hint, /Take the elevator back to Floor 8/);
  mission.visit('floor8');
  assert.ok(mission.hasActivity('rescue'));
  const ordered = missionStatus.missions.slice(3).filter(item => !item.complete);
  for (const item of ordered) {
    assert.ok(missionStatus.hint);
    assert.equal(mission.activity(item.id), true);
    assert.equal(mission.activity(item.id), false);
  }
  assert.equal(missionStatus.hint, '');
  assert.equal(notifications.at(-1), 'Secret Apartment — Mission Complete');
  mission.reset();
  assert.ok(missionStatus.missions.every(item => !item.complete));
});

test('the elevator calls without a card, rejects locked floors, and seals during allowed travel', async () => {
  const game = await fixture();
  const { area, scene, position, player, arrivals, move, act, update, worlds, action, cues, missionHud } = game;
  const first = scene.getObjectByName('basement');
  const panel = first.getObjectByName('Sliding elevator door');
  const closedX = panel.position.x;
  assert.ok(first.visible);
  const basementFocus = area.droneView;
  assert.equal(basementFocus.center.x, -88);
  assert.ok(basementFocus.width > 30 && basementFocus.width < 35);
  assert.equal(area.blocksGround(-88, -9.75), true);
  assert.equal(area.blocksGround(-78.75, 3.75), true, 'the lit car is solid');
  assert.equal(area.blocksGround(-82.78, 4.4), true, 'the parking column is solid');
  move(-84.5, 5.8);
  move(-81.63, 5.8);
  move(-81.63, 2.05);
  move(-77.7, 2.05);
  move(-81.63, 2.05);
  move(-86.35, 1.9);
  move(-86.36, -8.31);
  act('Call elevator');
  update(0.25);
  assert.notEqual(panel.position.x, closedX);
  update(0.55);
  move(-88, -8.65);
  move(-88, -11.18);
  act('Go to Floor 8');
  assert.match(missionHud.toast.textContent, /Access Card Required/);
  act('Go to Floor 17');
  assert.match(missionHud.toast.textContent, /Access Card Required/);
  update(2);
  assert.equal(arrivals.length, 0);
  assert.equal(cues.length, 3);
  assert.equal(area.blocksGround(-88, -9.75), false);

  move(-88, -8.65);
  move(-86.35, -8.2);
  game.takeCard();
  game.approachElevator();
  move(-88, -8.65);
  move(-88, -11.18);
  act('Go to Floor 17');
  assert.match(missionHud.toast.textContent, /Floor 17 Locked/);
  const floor8 = act('Go to Floor 8');
  floor8.act(action);
  assert.equal(area.missionStatus.hint, 'Wait for the elevator to reach Floor 8.');
  assert.equal(missionHud.toast.textContent, 'Elevator in transit to Floor 8.');
  assert.equal(cues.length, 7);
  assert.equal(area.blocksGround(-88, -9.75), true);
  update(0.95);
  assert.equal(arrivals.length, 0);
  update(0.45);
  assert.equal(arrivals.length, 1);
  assert.deepEqual(position.toArray(), [0, 1.68, -12.275]);
  assert.equal(area.blocksGround(position.x, position.z), false);
  assert.equal(first.visible, false);
  assert.equal(scene.getObjectByName('floor8').visible, true);
  assert.notEqual(area.droneView, basementFocus);
  assert.ok(Math.abs(area.droneView.center.x) < 1);
  assert.ok(area.droneView.width > 70 && area.droneView.width < 81);
  assert.match(area.missionStatus.hint, /approach the glass doors/);
  assert.ok(player.jump());
  const idle = new THREE.Vector2();
  for (let i = 0; i < 30; i++) {
    player.move(0.04, idle, worlds.active);
    assert.ok(position.y < 2.44, 'the player camera stays below the cabin ceiling while jumping');
  }
  assert.equal(position.y, 1.68);
  update(0.75);
  act('Go to Floor 17');
  assert.match(missionHud.toast.textContent, /Floor 17 Locked/);
  worlds.unload();
});

test('only the illuminated car offers a safe one-way door and a single access card', async () => {
  const { area, scene, move, act, update, worlds, find, prompt, cues, approachCar, missionHud } = await fixture();
  const car = scene.getObjectByName('Sedan with illuminated cabin');
  const door = car.getObjectByName('Driver door');
  const card = car.getObjectByName('Access card');
  assert.ok(car.children.some(child => child.isPointLight && child.intensity > 0));
  assert.equal(card.visible, false);
  assert.equal(area.missionStatus.hint, 'Find the car with the cabin light on.');
  move(-93.3, 5.32);
  assert.notEqual(prompt('Open Car Door')?.label, 'Open Car Door');

  approachCar();
  move(-79.55, 5.43);
  act('Open Car Door');
  assert.match(missionHud.toast.textContent, /Step back to give the door room/);
  assert.equal(door.rotation.y, 0);
  move(-80.60, 5.37);
  const open = act('Open Car Door');
  open.act();
  assert.equal(find('Take Access Card').active, false);
  update(0.3);
  assert.ok(door.rotation.y < 0 && door.rotation.y > -1.31);
  update(0.35);
  const openAngle = door.rotation.y;
  assert.ok(openAngle < -1.2);
  assert.equal(area.blocksGround(-79.73, 5.49), true, 'the open door remains solid');
  assert.equal(card.visible, true);
  move(-80.36, 5.32);
  const collect = act('Take Access Card');
  collect.act();
  open.act();
  assert.equal(card.visible, false);
  assert.equal(cues.length, 3);
  assert.match(area.missionStatus.hint, /Use the access card to reach Floor 8/);
  assert.deepEqual(area.missionStatus.inventory, ['Access card']);
  assert.match(missionHud.toast.textContent, /Access card acquired/);
  update(3);
  missionHud.advance(3000);
  assert.equal(missionHud.toast.textContent, '');
  assert.equal(door.rotation.y, openAngle);
  worlds.unload();
});

test('the gazebo and kitchen routes remain walkable and the ending is confined to Unit 17E', async () => {
  const game = await fixture();
  const { area, scene, position, move, act, update, worlds, find, cues, hud, action, missionHud } = game;
  const unit = scene.getObjectByName('Unit 17E interior');
  const material = unit.getObjectByName('White marble television feature wall').material;
  const intactColor = material.color.clone();
  const lights = unit.children.filter(child => child.isPointLight);
  const intactIntensity = lights[0].intensity;
  const corridor = scene.getObjectByName('floor17').children.find(child => child.isInstancedMesh);
  const corridorColor = corridor.material.color.clone();
  const [flash, title] = hud.overlay.children;
  const lighter = scene.getObjectByName('Collectible lighter');
  const oven = scene.getObjectByName('Oven front');
  const ovenGlow = oven.getObjectByName('Stylized oven glow');
  const smoke = scene.getObjectByName('Cinematic smoke');
  const marks = scene.getObjectByName('Scorch marks');
  assert.equal(lighter.visible, true);
  assert.equal(find('Activate Prop Control').active, false);
  assert.equal(find('Place Lighter in Oven').active, false);
  assert.ok(scene.getObjectByName('Gazebo table surface'));

  game.kitchen();
  assert.ok(Math.abs(area.droneView.center.x - 88) < 1);
  assert.ok(area.droneView.width > 20 && area.droneView.width < 25);
  find('Pick Up Lighter').act();
  assert.equal(lighter.visible, false);
  assert.equal(position.x, 97.15);
  assert.equal(area.blocksGround(88 + oven.position.x + 0.24, oven.position.z), true);
  assert.equal(area.blocksGround(92.6, -10.65), true, '17C remains closed');
  assert.equal(find('Open Unit 17E').active, false);
  assert.match(area.missionStatus.hint, /Explore the kitchen/);
  assert.deepEqual(area.missionStatus.inventory, ['Access card', 'Lighter']);
  assert.equal(scene.getObjectByName('Unit 17E entry door').rotation.y, -1.67);
  assert.equal(find('Place Lighter in Oven').active, false);
  find('Place Lighter in Oven').act();
  assert.equal(title.textContent, '');

  const control = act('Activate Prop Control');
  control.act();
  const start = act('Place Lighter in Oven');
  update(0.05);
  assert.equal(ovenGlow.visible, true);
  assert.deepEqual(area.missionStatus.inventory, ['Access card']);
  const sequence = [title.textContent];
  for (let second = 0; second < 5; second++) {
    start.act();
    update(1);
    sequence.push(title.textContent);
  }
  assert.deepEqual(sequence, ['5', '4', '3', '2', '1', 'BOOM!']);
  assert.equal(find('Go to Basement').active, false);
  assert.equal(marks.visible, true);
  assert.equal(smoke.visible, true);
  assert.ok(Number(flash.style.opacity) > 0);
  assert.equal(ovenGlow.visible, false);
  assert.ok(lights[0].intensity < intactIntensity);
  assert.ok(!material.color.equals(intactColor));
  assert.ok(corridor.material.color.equals(corridorColor));
  update(3);
  assert.equal(smoke.visible, false);
  assert.equal(title.textContent, '');
  assert.match(missionHud.toast.textContent, /Unit 17E sequence complete/);
  const endingCues = cues.length;
  start.act(action);
  update(6);
  assert.equal(cues.length, endingCues);
  const fire = scene.getObjectByName('Persistent stylized fire');
  const debris = scene.getObjectByName('Broken furniture and debris');
  const helicopter = scene.getObjectByName('Waiting rescue helicopter');
  assert.ok(fire.visible && debris.visible);
  assert.equal(helicopter.visible, false);

  move(96.25, -2.74);
  move(92.75, -2.74);
  move(92.75, -7.2);
  move(88, -7.7);
  move(88, -12);
  act('Go to Floor 8');
  update(2);
  assert.equal(area.blocksGround(-4.5, 14.1), true);
  assert.equal(area.blocksGround(11.6, 18.3), true);
  assert.equal(helicopter.visible, true);
  assert.equal(area.interactions.some(item => /helicopter/i.test(item.label)), false);
  assert.ok(area.missionStatus.missions.find(item => item.id === 'rescue').complete);
  act('Go to Floor 17');
  update(2);
  assert.equal(marks.visible, true);
  assertProgress(area.missionStatus, [2, 2, 5], [true, true, true]);
  worlds.reset();
  assert.equal(marks.visible, false);
  assert.ok(!fire.visible && !debris.visible && !helicopter.visible);
  assert.equal(area.droneView.center.x, -88);
  assert.equal(lighter.visible, true);
  assert.ok(material.color.equals(intactColor));
  assert.equal(lights[0].intensity, intactIntensity);
  assert.equal(scene.getObjectByName('Unit 17E entry door').rotation.y, 0);
  worlds.unload();
  assert.equal(game.elements.has(hud.overlay), false);
});

test('garage activities, automatic gym access, fountain and jumpable loungers have mission coverage', async t => {
  const { area, scene, player, worlds, move, act, update, cues, position, takeCard, enterElevator } = await fixture();
  t.after(worlds.unload);
  const completed = id => area.missionStatus.missions.find(item => item.id === id).complete;
  assert.ok(scene.getObjectByName('Adult couple sharing a kiss'));
  assert.ok(scene.getObjectByName('Basement waste and recycling station'));
  move(-84.05, 10.15);
  const initialCues = cues.length;
  act('Check parking directory');
  assert.ok(completed('directory'));
  move(-90.55, 10.14);
  act('Recycle bottle');
  update(.35);
  assert.ok(scene.getObjectByName('Recycled bottle').visible);
  assert.equal(cues.length, initialCues + 2);
  assert.ok(completed('recycle'));
  move(-87.76, 9.5);
  takeCard();
  enterElevator();
  act('Go to Floor 8');
  update(2);
  assert.equal(scene.getObjectByName('8E'), undefined);
  assert.equal(scene.getObjectByName('8F'), undefined);
  assert.equal(scene.getObjectByName('8G'), undefined);
  move(0, -6.78);
  update(.75);
  move(0, -1.9);
  assert.ok(completed('terrace'));
  update(1);
  assert.ok(area.blocksGround(0, -5.31));
  move(4.91, -1.9);
  move(4.98, 1.17);
  act('Turn on garden fountain');
  update(.15);
  assert.ok(completed('fountain'));
  assert.ok(scene.getObjectByName('Fountain water jets').visible);

  move(9.11, 1.17);
  move(9.11, 3.35);
  move(15.65, 3.35);
  update(.75);
  assert.equal(area.blocksGround(15.65, 2.35), false);
  move(15.65, .74);
  move(12.38, .74);
  assert.ok(completed('gym'));
  const belt = scene.getObjectByName('Treadmill moving belt');
  const initial = belt.position.z;
  act('Start gym treadmill');
  update(.25);
  assert.ok(completed('treadmill'));
  assert.notEqual(belt.position.z, initial);
  move(15.65, .74);
  update(.75);
  move(15.65, 3.35);
  move(18.28, 3.35);
  move(18.28, 11.72);
  move(17.72, 13.83);
  assert.equal(walkElevation(area, position, 17.72, 14.9, 0, true), null);
  assert.ok(player.jump());
  const direction = new THREE.Vector2(0, -1);
  for (let i = 0; i < 40; i++) {
    if (position.z > 15.65) direction.set(0, 0);
    player.move(.025, direction, worlds.active);
    worlds.update(.025, position);
  }
  assert.ok(position.z > 15.1, 'the player can jump across the lounger');
  assert.ok(completed('lounger'));
});

test('restart cancels transit and countdown and restores both items, doors and access rules', async () => {
  const game = await fixture(true);
  const { area, scene, definition, player, position, worlds, lifetime, arrivals, move, act, update, hud, cues, missionHud } = game;
  game.takeCard();
  game.enterElevator();
  act('Go to Floor 8');
  update(0.3);
  let disposed = 0;
  scene.getObjectByName('Main swimming pool').material.addEventListener('dispose', () => disposed++);
  worlds.reset();
  player.reset(definition.spawn, area);
  update(3);
  assert.equal(arrivals.length, 0);
  assert.equal(area.missionStatus.hint, 'Find the car with the cabin light on.');
  assert.deepEqual(area.missionStatus.inventory, []);
  assert.equal(position.z, definition.spawn.z);
  assert.equal(area.blocksGround(-88, -9.75), true);
  assert.equal(scene.getObjectByName('Driver door').rotation.y, 0);
  assert.equal(scene.getObjectByName('Access card').visible, false);
  assert.equal(scene.getObjectByName('floor8').visible, false);

  game.kitchen();
  act('Activate Prop Control');
  act('Place Lighter in Oven');
  update(1.5);
  assert.equal(hud.overlay.children[1].textContent, '4');
  const cueCount = cues.length;
  worlds.reset();
  player.reset(definition.spawn, area);
  update(8);
  assert.equal(cues.length, cueCount);
  assert.equal(hud.overlay.children[1].textContent, '');
  assert.equal(scene.getObjectByName('Scorch marks').visible, false);
  assert.equal(scene.getObjectByName('Collectible lighter').visible, true);
  move(-87.4, -8.35);
  act('Call elevator');
  update(0.1);
  move(-88, -8.65);
  move(-88, -11.18);
  act('Go to Floor 8');
  assert.match(missionHud.toast.textContent, /Access Card Required/);
  worlds.unload();
  assert.equal(lifetime.signal.aborted, true);
  assert.equal(disposed, 1);
  assert.equal(scene.children.length, 0);
});

test('reduced motion retains countdown and damage at a low frame rate with no flash or smoke', async () => {
  const { area, act, update, scene, hud, worlds, position, kitchen } = await fixture(true);
  kitchen();
  assert.equal(scene.getObjectByName('Main swimming pool').material.uniforms.time.value, 0);
  act('Activate Prop Control');
  act('Place Lighter in Oven');
  for (let i = 0; i < 25; i++) worlds.update(0.05, position, 0.2);
  assert.equal(hud.overlay.children[1].textContent, 'BOOM!');
  assert.equal(Number(hud.overlay.children[0].style.opacity), 0);
  assert.equal(scene.getObjectByName('Cinematic smoke').visible, false);
  assert.equal(scene.getObjectByName('Scorch marks').visible, true);
  update(3);
  assertProgress(area.missionStatus, [2, 2, 5], [true, true, true]);
  worlds.unload();
});
